// notes add <text> | notes list | notes delete <id>. Run with: node src/cli.ts <command>
import { addNote, deleteNote, formatList, loadNotes, NotesError, parseId, saveNotes } from "./notes.ts";
import { createInterface, emitKeypressEvents } from "node:readline";
import type { Interface } from "node:readline";
import { addFromUi, handleKey, renderScreen } from "./ui.ts";
import type { UiState } from "./ui.ts";

export interface Result {
  code: number;
  out: string;
}

const USAGE = "usage: notes add <text> | notes list | notes delete <id>";

export function run(argv: string[], file: string, today: string): Result {
  const [command, ...rest] = argv;
  try {
    const notes = loadNotes(file);
    if (command === "add") {
      const next = addNote(notes, rest.join(" "), today);
      saveNotes(file, next);
      return { code: 0, out: `Added note ${next[next.length - 1].id}.` };
    }
    if (command === "ui") return { code: 0, out: "" };
    if (command === "list") return { code: 0, out: formatList(notes) };
    if (command === "delete") {
      const id = parseId(rest[0]);
      saveNotes(file, deleteNote(notes, id));
      return { code: 0, out: `Deleted note ${id}.` };
    }
    return { code: 2, out: USAGE };
  } catch (err) {
    if (err instanceof NotesError || err instanceof SyntaxError) return { code: 1, out: `error: ${err.message}` };
    throw err;
  }
}

function draw(state: UiState, msg = ""): void {
  process.stdout.write("\x1b[2J\x1b[H" + renderScreen(state) + (msg ? `\n${msg}` : "") + "\n");
}

const keyName = (key?: { name?: string; ctrl?: boolean }): string => (key?.ctrl && key.name === "c" ? "ctrl-c" : (key?.name ?? ""));

const setRaw = (on: boolean): void => void process.stdin.setRawMode(on);

function askNote(rl: Interface, file: string, today: string, state: UiState, done: (s: UiState) => void): void {
  setRaw(false);
  rl.question("New note: ", (text) => {
    try {
      const next = addFromUi(state, text, today);
      saveNotes(file, next.notes);
      draw(next);
      done(next);
    } catch (err) {
      if (!(err instanceof NotesError)) throw err;
      draw(state, `error: ${err.message}`);
      done(state);
    }
  });
}

function startUi(file: string, today: string): void {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  emitKeypressEvents(process.stdin, rl);
  let state: UiState = { notes: loadNotes(file), selected: 0 };
  let busy = false;
  const quit = (): void => {
    setRaw(false);
    process.stdout.write("\x1b[?25h");
    rl.close();
  };
  const done = (s: UiState): void => void ((state = s), (busy = false), setRaw(true));
  process.on("exit", quit);
  process.stdin.on("keypress", (_s, key) => {
    if (busy) return;
    const r = handleKey(state, keyName(key));
    state = r.state;
    if (r.action === "quit") return quit();
    if (r.action === "save") saveNotes(file, state.notes);
    if (r.action === "add") return void ((busy = true), askNote(rl, file, today, state, done));
    draw(state);
  });
  setRaw(true);
  draw(state);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const file = process.env.NOTES_FILE ?? "notes.json";
  const today = new Date().toISOString().slice(0, 10);
  if (args[0] === "ui") startUi(file, today);
  else process.exitCode = ((r) => (console.log(r.out), r.code))(run(args, file, today));
}
