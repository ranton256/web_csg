// Tab and Shift+Tab indentation in the source editor (DESIGN §8 Live rebuild
// and progressive rendering; D23). No browser APIs, so Node tests check the
// rules directly; main.js applies the edits.

export const INDENT = '  ';

// Where the line containing offset i starts.
const lineStartOf = (text, i) => text.lastIndexOf('\n', i - 1) + 1;

// The edit for Tab, or for Shift+Tab when outdent is true, given the
// selection [start, end) in text. Returns { from, to, insert, selectionStart,
// selectionEnd }: replace text.slice(from, to) with insert, then select
// [selectionStart, selectionEnd). The selection stays over the same text.
export function indentEdit(text, start, end, { outdent = false } = {}) {
  const selection = text.slice(start, end);

  // Tab with no selection, or a selection inside one line: two spaces replace it.
  if (!outdent && !selection.includes('\n')) {
    const caret = start + INDENT.length;
    return { from: start, to: end, insert: INDENT, selectionStart: caret, selectionEnd: caret };
  }

  // Otherwise the edit works on every line the selection touches. A selection
  // that ends at the very start of a line includes none of that line.
  const last = end > start && lineStartOf(text, end) === end ? end - 1 : end;
  const from = lineStartOf(text, start);
  const lastLineEnd = text.indexOf('\n', last);
  const to = lastLineEnd === -1 ? text.length : lastLineEnd;

  // Each change is { at, delta }: delta characters added (> 0) or removed
  // (< 0) at the offset where a touched line starts.
  const changes = [];
  const lines = text.slice(from, to).split('\n');
  let at = from;
  const edited = lines.map((line) => {
    let result = line;
    if (outdent) {
      const removed = line.length - line.replace(/^ {1,2}/, '').length;
      if (removed > 0) changes.push({ at, delta: -removed });
      result = line.slice(removed);
    } else {
      changes.push({ at, delta: INDENT.length });
      result = INDENT + line;
    }
    at += line.length + 1;
    return result;
  });

  // Where an offset in the old text lands in the new one.
  const map = (offset) => {
    let moved = offset;
    for (const change of changes) {
      if (change.delta > 0 && change.at <= offset) moved += change.delta;
      if (change.delta < 0 && change.at < offset) moved -= Math.min(-change.delta, offset - change.at);
    }
    return moved;
  };
  return { from, to, insert: edited.join('\n'), selectionStart: map(start), selectionEnd: map(end) };
}

// Applies an edit to text, for tests and fallbacks: the resulting text.
export function applyEdit(text, edit) {
  return text.slice(0, edit.from) + edit.insert + text.slice(edit.to);
}
