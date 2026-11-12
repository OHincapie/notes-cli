import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run } from "../src/cli.ts";
import { addNote, deleteNote, filterByTag, formatList, NotesError, type Note } from "../src/notes.ts";

const DAY = "2026-11-06";
const tmpFile = () => join(mkdtempSync(join(tmpdir(), "notes-")), "notes.json");

describe("notes", () => {
  it("adds a note with the next id", () => {
    const notes = addNote(addNote([], "first", DAY), "second", DAY);
    expect(notes.map((n) => n.id)).toEqual([1, 2]);
  });

  it("trims text and refuses empty notes", () => {
    expect(addNote([], "  hi  ", DAY)[0].text).toBe("hi");
    expect(() => addNote([], "   ", DAY)).toThrow(NotesError);
  });

  it("deletes by id and refuses unknown ids", () => {
    const notes: Note[] = addNote([], "a", DAY);
    expect(deleteNote(notes, 1)).toEqual([]);
    expect(() => deleteNote(notes, 9)).toThrow("no note with id 9");
  });

  it("formats a list", () => {
    expect(formatList([])).toBe("No notes yet.");
    expect(formatList(addNote([], "milk", DAY))).toBe("1. milk (2026-11-06)");
  });
});

describe("cli", () => {
  it("adds and lists notes in the file", () => {
    const file = tmpFile();
    expect(run(["add", "buy", "milk"], file, DAY)).toEqual({ code: 0, out: "Added note 1." });
    expect(run(["list"], file, DAY).out).toBe("1. buy milk (2026-11-06)");
  });

  it("deletes a note", () => {
    const file = tmpFile();
    run(["add", "x"], file, DAY);
    expect(run(["delete", "1"], file, DAY).code).toBe(0);
    expect(run(["list"], file, DAY).out).toBe("No notes yet.");
  });

  it("reports errors with exit code 1", () => {
    const file = tmpFile();
    writeFileSync(file, "{ not json");
    expect(run(["list"], file, DAY).code).toBe(1);
    expect(run(["delete", "3"], tmpFile(), DAY)).toEqual({ code: 1, out: "error: no note with id 3" });
  });

  it("prints usage for unknown commands", () => {
    expect(run(["fly"], tmpFile(), DAY).code).toBe(2);
  });

  it("adds tagged notes and lists them with tags", () => {
    const file = tmpFile();
    expect(run(["add", "--tag", "a", "--tag", "b", "some", "text"], file, DAY)).toEqual({ code: 0, out: "Added note 1." });
    expect(run(["list"], file, DAY).out).toBe("1. some text [a, b] (2026-11-06)");
  });

  it("filters the list by tag", () => {
    const file = tmpFile();
    run(["add", "text", "--tag", "a"], file, DAY);
    run(["add", "plain"], file, DAY);
    expect(run(["list", "--tag", "a"], file, DAY).out).toBe("1. text [a] (2026-11-06)");
    expect(run(["list"], file, DAY).out.split("\n")).toHaveLength(2);
  });

  it("fails when --tag has no value", () => {
    expect(run(["add", "--tag"], tmpFile(), DAY).code).toBe(1);
    expect(run(["list", "--tag"], tmpFile(), DAY).code).toBe(1);
  });
});

describe("tags", () => {
  it("normalizes tags and omits the field when there are none", () => {
    expect(addNote([], "x", DAY, [" Work ", "work", "B"])[0].tags).toEqual(["work", "b"]);
    expect("tags" in addNote([], "x", DAY)[0]).toBe(false);
  });

  it("refuses empty tags", () => {
    expect(() => addNote([], "x", DAY, ["  "])).toThrow(NotesError);
  });

  it("filters by tag in any position, case-insensitively", () => {
    const notes = addNote(addNote([], "a", DAY, ["x", "y"]), "b", DAY);
    expect(filterByTag(notes, "Y").map((n) => n.id)).toEqual([1]);
    expect(filterByTag(notes, "zzz")).toEqual([]);
  });

  it("formats tagged notes", () => {
    expect(formatList(addNote([], "milk", DAY, ["home", "shop"]))).toBe("1. milk [home, shop] (2026-11-06)");
  });
});
