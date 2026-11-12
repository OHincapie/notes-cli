// Pure terminal UI state: no drawing and no key reading.
import { addNote } from "./notes.ts";
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

export type UiAction = "none" | "add" | "quit" | "save";
export interface KeyResult {
  state: UiState;
  action: UiAction;
}

export function handleKey(state: UiState, key: string): KeyResult {
  if (key === "up" || key === "down") return { state: moveSelection(state, key), action: "none" };
  if (key === "d" && state.notes.length > 0) return { state: removeSelected(state), action: "save" };
  if (key === "a") return { state, action: "add" };
  if (key === "q" || key === "ctrl-c") return { state, action: "quit" };
  return { state, action: "none" };
}

export function addFromUi(state: UiState, text: string, today: string): UiState {
  const notes = addNote(state.notes, text, today);
  return { notes, selected: notes.length - 1 };
}

export function renderScreen(state: UiState): string {
  const lines =
    state.notes.length === 0
      ? ["No notes yet."]
      : state.notes.map((n, i) => (i === state.selected ? "> " : "  ") + n.text);
  return [...lines, FOOTER].join("\n");
}
