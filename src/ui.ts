// Pure terminal UI state: no drawing and no key reading.
import type { Note } from "./notes.ts";

export interface UiState {
  notes: Note[];
  selected: number;
}

const FOOTER = "↑/↓ move · a add · d delete · q quit";

export function moveSelection(state: UiState, dir: "up" | "down"): UiState {
  const last = Math.max(state.notes.length - 1, 0);
  const next = state.selected + (dir === "down" ? 1 : -1);
  return { notes: [...state.notes], selected: Math.min(Math.max(next, 0), last) };
}

export function removeSelected(state: UiState): UiState {
  const notes = state.notes.filter((_, i) => i !== state.selected);
  const last = Math.max(notes.length - 1, 0);
  return { notes, selected: Math.min(state.selected, last) };
}

export function renderScreen(state: UiState): string {
  const lines =
    state.notes.length === 0
      ? ["No notes yet."]
      : state.notes.map((n, i) => (i === state.selected ? "> " : "  ") + n.text);
  return [...lines, FOOTER].join("\n");
}
