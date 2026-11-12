#!/usr/bin/env bash
# gates/30-function-length.sh — functions in changed src/ files stay under 30 lines (AGENTS.md).
# TypeScript 7 has no JS parser API, so this scans braces: comments and strings are blanked first,
# then each `{` whose header looks like a function (function, =>, or a method) is matched to its `}`.
MAX_LINES=30 exec node --input-type=module - $(grep -E '^src/.*\.[cm]?tsx?$' <<<"$FACTORY_CHANGED") <<'JS'
import { existsSync, readFileSync } from "node:fs";
const MAX = Number(process.env.MAX_LINES);
const KEYWORDS = /^(if|for|while|switch|catch|with|return|else|do|try|finally)\b/;

function blank(src) { // comments and string contents become spaces; newlines stay, so lines still count
  let out = "", i = 0;
  while (i < src.length) {
    const two = src.slice(i, i + 2), c = src[i];
    let end = i + 1;
    if (two === "//") end = src.indexOf("\n", i) === -1 ? src.length : src.indexOf("\n", i);
    else if (two === "/*") end = src.indexOf("*/", i + 2) === -1 ? src.length : src.indexOf("*/", i + 2) + 2;
    else if (c === '"' || c === "'" || c === "`") {
      while (end < src.length && src[end] !== c) end += src[end] === "\\" ? 2 : 1;
      end += 1;
    } else { out += c; i++; continue; }
    out += src.slice(i, end).replace(/[^\n]/g, " ");
    i = end;
  }
  return out;
}

function isFunctionHeader(header) {
  const h = header.replace(/\s+/g, " ").trim().replace(/^(export |default |async |static |public |private |protected |get |set )+/, "");
  if (/\bfunction\b/.test(h) || /=>$/.test(h)) return true;
  return !KEYWORDS.test(h) && /^[\w$]+\s*(<[^>]*>)?\s*\(.*\)\s*(:.*)?$/.test(h);
}

const problems = [];
for (const file of process.argv.slice(2).filter(existsSync)) {
  const text = blank(readFileSync(file, "utf8"));
  const stack = [];
  let line = 1, headerStart = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\n") line++;
    else if (c === "{") { stack.push({ line, fn: isFunctionHeader(text.slice(headerStart, i)) }); headerStart = i + 1; }
    else if (c === "}") {
      const open = stack.pop();
      const length = open ? line - open.line + 1 : 0;
      if (open?.fn && length > MAX) problems.push(`${file}:${open.line}: function is ${length} lines (max ${MAX})`);
      headerStart = i + 1;
    } else if (c === ";") headerStart = i + 1;
  }
}
if (problems.length) {
  console.log(problems.join("\n"));
  console.log("Split long functions into smaller ones (AGENTS.md: keep functions under 30 lines).");
  process.exit(1);
}
console.log("Function length OK.");
JS
