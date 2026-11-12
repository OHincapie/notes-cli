#!/usr/bin/env bash
# gates/10-diff-size.sh — a factory change stays small enough for a human to review in one sitting.
# Counts added + deleted lines in src/ and test/ against the commit the run started from.
MAX_LINES=150
total="$(git diff --numstat "$FACTORY_BASE" -- src test | awk '{ if ($1 != "-") n += $1 + $2 } END { print n + 0 }')"
if [ "$total" -gt "$MAX_LINES" ]; then
  echo "The change touches $total lines in src/ and test/; the maximum is $MAX_LINES."
  echo "Split the issue into smaller ones."
  exit 1
fi
echo "Diff size OK: $total lines (max $MAX_LINES)."
