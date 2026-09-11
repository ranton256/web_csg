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
const isHighSurrogate = (ch) => ch >= '\uD800' && ch <= '\uDBFF';
const isLowSurrogate = (ch) => ch >= '\uDC00' && ch <= '\uDFFF';
const BYTE_ORDER_MARK = String.fromCodePoint(0xfeff);

// Characters a diagnostic cannot show as a glyph (D17): spaces, line and
// paragraph separators, controls, and format characters.
const INVISIBLE = /[\p{Zs}\p{Zl}\p{Zp}\p{Cc}\p{Cf}]/u;

// Names shown for common invisible characters (D17).
export const CHARACTER_NAMES = new Map([
  [0x00a0, 'no-break space'],
  [0x00ad, 'soft hyphen'],
  [0x2002, 'en space'],
  [0x2003, 'em space'],
  [0x2009, 'thin space'],
  [0x200b, 'zero-width space'],
  [0x200c, 'zero-width non-joiner'],
  [0x200d, 'zero-width joiner'],
  [0x2028, 'line separator'],
  [0x2029, 'paragraph separator'],
  [0x202f, 'narrow no-break space'],
  [0x2060, 'word joiner'],
  [0x3000, 'ideographic space'],
  [0xfeff, 'byte-order mark'],
]);

// How a diagnostic names one character (D17): 'X' for visible ASCII,
// 'X' (U+XXXX) for other visible characters, and U+XXXX, with a name when it
// has one, for invisible characters.
export function describeCharacter(character) {
  const codePoint = character.codePointAt(0);
  const hex = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
  if (INVISIBLE.test(character)) {
    const name = CHARACTER_NAMES.get(codePoint);
    return name === undefined ? hex : `${hex} (${name})`;
  }
  return codePoint < 0x80 ? `'${character}'` : `'${character}' (${hex})`;
}

// Returns an array of { type, value, line, column } tokens ending with an
// 'eof' token. Types: 'number', 'identifier', 'keyword', 'punct'.
// Throws SourceError at the first character that cannot start a token.
export function tokenize(source) {
  const tokens = [];
  // One byte-order mark at the very start is skipped, and takes no column (D17).
  let i = source[0] === BYTE_ORDER_MARK ? 1 : 0;
  let line = 1;
  let column = 1;

  // Columns count characters (code points): a surrogate pair such as an emoji
  // is one column.
  const advance = () => {
    const ch = source[i++];
    if (ch === '\n') {
      line++;
      column = 1;
    } else if (ch === '\r' && source[i] === '\n') {
      // The following \n ends the line.
    } else {
      if (isHighSurrogate(ch) && isLowSurrogate(source[i])) i++;
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
      const value = Number(text);
      if (!Number.isFinite(value)) throw new SourceError('number is too large', startLine, startColumn);
      tokens.push({ type: 'number', value, text, line: startLine, column: startColumn });
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

    throw new SourceError(`unexpected character ${describeCharacter(String.fromCodePoint(source.codePointAt(i)))}`, startLine, startColumn);
  }

  tokens.push({ type: 'eof', value: null, line, column });
  return tokens;
}
