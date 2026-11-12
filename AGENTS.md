# Notes CLI

A tiny command-line notes app in TypeScript: `node src/cli.ts add <text> | list | delete <id>`.
Node runs the TypeScript directly (type stripping), so there is no build step.

## Commands
- Test: the TEST_CMD in factory.conf (vitest; must pass before any PR)
- Lint: the LINT_CMD in factory.conf (the TypeScript type check)

## Conventions
- TypeScript, strict. Relative imports end in `.ts`. Only erasable syntax (no enums, no namespaces).
- Logic lives in `src/notes.ts` as pure functions; `src/cli.ts` only parses arguments and prints.
- Every behaviour change gets a vitest test in `test/`, written BEFORE the implementation.
- Keep functions under 30 lines. package.json is protected, so nothing new can be installed.

## Gates (gates/, run after the checker; any failure rejects the run)
- `10-diff-size.sh`: at most 150 added + deleted lines in src/ and test/.
- `20-tests-with-change.sh`: a change to src/ comes with a change to test/; the number of test
  cases never goes down; no new `.skip`, `.only` or `.todo`.
- `30-function-length.sh`: functions in changed src/ files stay under 30 lines.
- `no-new-deps.sh`: src/ imports only Node built-ins, relative files and package.json dependencies.

## Factory rules
- Phase state lives in `.factory/` as markdown files. Never put plan or review text in code comments.
- Only the paths in SCOPE (factory.conf) may change. Do not touch factory.sh, lib/, gates/, .claude/, package.json or this file.
