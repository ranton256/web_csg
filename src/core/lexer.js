// Turns source text into tokens, each with a 1-based line and column.
// Lines end at "\n" ("\r\n" counts as one line break); a tab is one column.

export class SourceError extends Error {
  constructor(message, line, column) {
    super(message);
    this.line = line;
    this.column = column;
  }
}

export const RESERVED_WORDS = new Set([
  'let', 'camera', 'light', 'material',
  'sphere', 'cube', 'box', 'cylinder',
  'translate', 'rotate', 'scale',
  'union', 'intersection', 'difference',
]);

const PUNCTUATION = new Set([';', ':', ',', '=', '{', '}', '(', ')', '[', ']', '-', '+', '*', '/']);

const isDigit = (ch) => ch >= '0' && ch <= '9';
const isIdentifierStart = (ch) => (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
const isIdentifierPart = (ch) => isIdentifierStart(ch) || isDigit(ch);
const isSpace = (ch) => ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';

// Returns an array of { type, value, line, column } tokens ending with an
// 'eof' token. Types: 'number', 'identifier', 'keyword', 'punct'.
// Throws SourceError at the first character that cannot start a token.
export function tokenize(source) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let column = 1;

  const advance = () => {
    const ch = source[i++];
    if (ch === '\n') {
      line++;
      column = 1;
    } else if (!(ch === '\r' && source[i] === '\n')) {
      column++;
    }
  };

  while (i < source.length) {
    const ch = source[i];

    if (isSpace(ch)) {
      advance();
      continue;
    }

    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') advance();
      continue;
    }

    const startLine = line;
    const startColumn = column;

    if (ch === '/' && source[i + 1] === '*') {
      advance();
      advance();
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) advance();
      if (i >= source.length) throw new SourceError('unterminated block comment', startLine, startColumn);
      advance();
      advance();
      continue;
    }

    if (isDigit(ch)) {
      let text = '';
      while (isDigit(source[i])) {
        text += source[i];
        advance();
      }
      if (source[i] === '.' && isDigit(source[i + 1])) {
        text += '.';
        advance();
        while (isDigit(source[i])) {
          text += source[i];
          advance();
        }
      }
      if (i < source.length && (isIdentifierPart(source[i]) || source[i] === '.')) {
        throw new SourceError('malformed number: numbers are digits with an optional fraction, like 12 or 1.5', startLine, startColumn);
      }
      tokens.push({ type: 'number', value: Number(text), text, line: startLine, column: startColumn });
      continue;
    }

    if (isIdentifierStart(ch)) {
      let text = '';
      while (i < source.length && isIdentifierPart(source[i])) {
        text += source[i];
        advance();
      }
      const type = RESERVED_WORDS.has(text) ? 'keyword' : 'identifier';
      tokens.push({ type, value: text, line: startLine, column: startColumn });
      continue;
    }

    if (PUNCTUATION.has(ch)) {
      advance();
      tokens.push({ type: 'punct', value: ch, line: startLine, column: startColumn });
      continue;
    }

    throw new SourceError(`unexpected character '${ch}'`, startLine, startColumn);
  }

  tokens.push({ type: 'eof', value: null, line, column });
  return tokens;
}
