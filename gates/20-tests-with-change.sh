#!/usr/bin/env bash
# gates/20-tests-with-change.sh — every behaviour change brings a test, and no agent weakens the suite.
#   1. If anything in src/ changed, something in test/ must have changed too.
#   2. The number of test cases (it/test calls) in test/ may not go down.
#   3. No new .skip, .only or .todo in test/.
pattern='\b(it|test)(\.(each|concurrent|fails)[^(]*)?\('

if grep -q '^src/' <<<"$FACTORY_CHANGED" && ! grep -q '^test/' <<<"$FACTORY_CHANGED"; then
  echo "src/ changed but no file in test/ did. Every behaviour change gets a test (AGENTS.md)."
  exit 1
fi

before="$(git ls-tree -r --name-only "$FACTORY_BASE" -- test | while read -r f; do git show "$FACTORY_BASE:$f"; done |
  grep -oE "$pattern" | wc -l | tr -d ' ')"
after="$(grep -rhoE "$pattern" test 2>/dev/null | wc -l | tr -d ' ')"
if [ "$after" -lt "$before" ]; then
  echo "test/ had $before test cases before this run and has $after now. Tests may be added, never removed."
  exit 1
fi

skipped="$(git diff "$FACTORY_BASE" -- test | grep -E '^\+' | grep -E '\b(it|test|describe)\.(skip|only|todo)\b' || true)"
if [ -n "$skipped" ]; then
  echo "The change adds a skipped, focused or todo test:"
  echo "$skipped"
  exit 1
fi
echo "Tests OK: $before → $after test cases."
