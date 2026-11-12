import { describe, expect, it } from "vitest";
import { moveSelection, removeSelected, renderScreen } from "../src/ui.ts";
import type { UiState } from "../src/ui.ts";

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
