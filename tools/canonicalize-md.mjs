import fs from "node:fs";
import normalizeNewline from "normalize-newline";

// md-normalized-v1: LF endings, no trailing whitespace, collapse >2 blank lines
export function canonicalizeMd(path) {
  let content = fs.readFileSync(path, "utf8");
  content = normalizeNewline(content);
  content = content.replace(/[ \t]+$/gm, "");
  content = content.replace(/\n{3,}/g, "\n\n");
  return content;
}

export function canonicalizeMdBuffer(path) {
  return Buffer.from(canonicalizeMd(path), "utf8");
}
