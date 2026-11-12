// notes add <text> | notes list | notes delete <id>. Run with: node src/cli.ts <command>
import { addNote, deleteNote, filterByTag, formatList, loadNotes, NotesError, saveNotes } from "./notes.ts";

export interface Result {
  code: number;
  out: string;
}

const USAGE = "usage: notes add [--tag <t>]... <text> | notes list [--tag <t>] | notes delete <id>";

function splitTag(args: string[]): { tags: string[]; rest: string[] } {
  const tags: string[] = [];
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== "--tag") rest.push(args[i]);
    else if (i + 1 < args.length) tags.push(args[++i]);
    else throw new NotesError("--tag needs a value");
  }
  return { tags, rest };
}

export function run(argv: string[], file: string, today: string): Result {
  const [command, ...rest] = argv;
  try {
    const notes = loadNotes(file);
    if (command === "add") {
      const { tags, rest: words } = splitTag(rest);
      const next = addNote(notes, words.join(" "), today, tags);
      saveNotes(file, next);
      return { code: 0, out: `Added note ${next[next.length - 1].id}.` };
    }
    if (command === "list") {
      const { tags } = splitTag(rest);
      const shown = tags.length > 0 ? filterByTag(notes, tags[tags.length - 1]) : notes;
      return { code: 0, out: formatList(shown) };
    }
    if (command === "delete") {
      saveNotes(file, deleteNote(notes, Number(rest[0])));
      return { code: 0, out: `Deleted note ${rest[0]}.` };
    }
    return { code: 2, out: USAGE };
  } catch (err) {
    if (err instanceof NotesError || err instanceof SyntaxError) return { code: 1, out: `error: ${err.message}` };
    throw err;
  }
}

if (import.meta.main) {
  const result = run(process.argv.slice(2), process.env.NOTES_FILE ?? "notes.json", new Date().toISOString().slice(0, 10));
  console.log(result.out);
  process.exitCode = result.code;
}
