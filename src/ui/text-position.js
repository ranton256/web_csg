// Converts diagnostic positions to text-area offsets. Diagnostics use 1-based
// lines and 1-based columns counted in characters (code points, as the lexer
// does); text areas use UTF-16 code-unit offsets.

export function lineCount(text) {
  let count = 1;
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) count++;
  return count;
}

const isHighSurrogate = (code) => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code) => code >= 0xdc00 && code <= 0xdfff;

// The offset of (line, column), clamped to the end of that line (or of the
// text, for a line past the end). A byte-order mark at the very start takes no
// column, as in the lexer (D17), so column 1 of line 1 follows it.
export function lineColumnToOffset(text, line, column) {
  let offset = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (let current = 1; current < line; current++) {
    const newline = text.indexOf('\n', offset);
    if (newline === -1) return text.length;
    offset = newline + 1;
  }
  let lineEnd = text.indexOf('\n', offset);
  if (lineEnd === -1) lineEnd = text.length;
  if (lineEnd > offset && text[lineEnd - 1] === '\r') lineEnd--; // "\r\n" is one line break

  for (let current = 1; current < column && offset < lineEnd; current++) {
    const pair = isHighSurrogate(text.charCodeAt(offset)) && isLowSurrogate(text.charCodeAt(offset + 1));
    offset += pair ? 2 : 1;
  }
  return offset;
}
