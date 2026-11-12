import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addFromUi, handleKey, moveSelection, removeSelected, renderScreen } from "../src/ui.ts";
import type { UiState } from "../src/ui.ts";
import { NotesError, saveNotes } from "../src/notes.ts";
import { run } from "../src/cli.ts";

const FOOTER = "↑/↓ move · a add · d delete · q quit";
const mk = (texts: string[], selected: number): UiState => ({
  notes: texts.map((text, i) => ({ id: i + 1, text, created: "2026-01-01" })),
  selected,
});

describe("moveSelection", () => {
  it("moves down and up", () => {
    expect(moveSelection(mk(["a", "b", "c"], 1), "down").selected).toBe(2);
    expect(moveSelection(mk(["a", "b", "c"], 1), "up").selected).toBe(0);
  });
  it("clamps at the ends", () => {
    expect(moveSelection(mk(["a", "b"], 0), "up").selected).toBe(0);
    expect(moveSelection(mk(["a", "b"], 1), "down").selected).toBe(1);
  });
  it("handles an empty list", () => {
    expect(moveSelection(mk([], 0), "up").selected).toBe(0);
    expect(moveSelection(mk([], 0), "down").selected).toBe(0);
  });
});

describe("removeSelected", () => {
  it("removes a middle note and keeps the index", () => {
    const s = removeSelected(mk(["a", "b", "c"], 1));
    expect(s.notes.map((n) => n.text)).toEqual(["a", "c"]);
    expect(s.selected).toBe(1);
  });
  it("moves to the new last index when the last is removed", () => {
    expect(removeSelected(mk(["a", "b"], 1)).selected).toBe(0);
  });
  it("handles one note and empty lists", () => {
    const one = removeSelected(mk(["a"], 0));
    expect(one.notes).toEqual([]);
    expect(one.selected).toBe(0);
    expect(removeSelected(mk([], 0))).toEqual(mk([], 0));
  });
});

describe("renderScreen", () => {
  it("marks the selected note and ends with the footer", () => {
    expect(renderScreen(mk(["a", "b"], 1))).toBe(`  a\n> b\n${FOOTER}`);
  });
  it("shows a message when empty", () => {
    expect(renderScreen(mk([], 0))).toBe(`No notes yet.\n${FOOTER}`);
  });
});

describe("immutability", () => {
  it("never mutates frozen input", () => {
    const s = mk(["a", "b"], 0);
    Object.freeze(s.notes);
    Object.freeze(s);
    const copy = JSON.stringify(s);
    moveSelection(s, "down");
    removeSelected(s);
    renderScreen(s);
    expect(JSON.stringify(s)).toBe(copy);
  });
});

describe("handleKey", () => {
  it("moves with up/down and returns none", () => {
    expect(handleKey(mk(["a", "b"], 0), "down")).toEqual({ state: mk(["a", "b"], 1), action: "none" });
    expect(handleKey(mk(["a", "b"], 0), "up").state.selected).toBe(0);
  });
  it("d removes the selected note and saves; empty list is none", () => {
    const r = handleKey(mk(["a", "b", "c"], 2), "d");
    expect(r).toEqual({ state: mk(["a", "b"], 1), action: "save" });
    expect(handleKey(mk([], 0), "d")).toEqual({ state: mk([], 0), action: "none" });
  });
  it("a adds, q and ctrl-c quit, others do nothing", () => {
    const s = mk(["a"], 0);
    expect(handleKey(s, "a")).toEqual({ state: s, action: "add" });
    expect(handleKey(s, "q").action).toBe("quit");
    expect(handleKey(s, "ctrl-c").action).toBe("quit");
    expect(handleKey(s, "x")).toEqual({ state: s, action: "none" });
    expect(handleKey(s, "")).toEqual({ state: s, action: "none" });
  });
  it("does not mutate a frozen state", () => {
    const s = Object.freeze({ ...mk(["a", "b"], 0), notes: Object.freeze(mk(["a", "b"], 0).notes) as never });
    for (const k of ["up", "down", "a", "d", "q", "ctrl-c", "x"]) handleKey(s, k);
    expect(s.selected).toBe(0);
  });
});

describe("addFromUi", () => {
  it("uses max id + 1 and the date, selecting the new note", () => {
    const s = mk(["a", "b", "c"], 0);
    const r = addFromUi({ ...s, notes: s.notes.filter((n) => n.id !== 2) }, "new", "2026-05-05");
    expect(r.notes[r.notes.length - 1]).toEqual({ id: 4, text: "new", created: "2026-05-05" });
    expect(r.selected).toBe(r.notes.length - 1);
  });
  it("rejects empty text", () => {
    expect(() => addFromUi(mk(["a"], 0), "", "2026-05-05")).toThrow(NotesError);
    expect(() => addFromUi(mk(["a"], 0), "   ", "2026-05-05")).toThrow(NotesError);
  });
});

describe("ui persistence and run", () => {
  const file = join(mkdtempSync(join(tmpdir(), "ui-")), "n.json");
  it("list shows added and not deleted notes", () => {
    const added = addFromUi(mk(["keep", "gone"], 1), "fresh", "2026-05-05");
    saveNotes(file, handleKey({ ...added, selected: 1 }, "d").state.notes);
    const out = run(["list"], file, "2026-05-05").out;
    expect(out).toContain("fresh");
    expect(out).not.toContain("gone");
  });
  it("run ui is not usage; empty run still is", () => {
    expect(run(["ui"], file, "2026-05-05")).toEqual({ code: 0, out: "" });
    expect(run([], file, "2026-05-05").code).toBe(2);
  });
});
