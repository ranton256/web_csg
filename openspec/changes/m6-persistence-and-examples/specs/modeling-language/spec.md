## MODIFIED Requirements

### Requirement: Lexical structure
Source: DESIGN §8 Modeling language; §12 D17.

The language SHALL recognize:
- **Comments:** `//` to the end of the line, and `/* … */` block comments,
  which do not nest. Comments may contain any character.
- **Numbers:** decimal numbers made of digits with an optional fraction
  (`12`, `1.5`, `0.5`). There is no exponent form, and no leading or trailing
  bare `.`. A literal too large to represent as a finite number is an error.
- **Identifiers:** an ASCII letter (`a`–`z`, `A`–`Z`) or `_`, then ASCII
  letters, digits, or `_`. Other letters, such as `é`, are not identifier
  characters (D17).
- **Reserved words:** `let`, `camera`, `light`, `material`, `sphere`, `cube`,
  `box`, `cylinder`, `translate`, `rotate`, `scale`, `union`, `intersection`,
  `difference`.
- **Punctuation:** `; : , = { } ( ) [ ]` and the operators `+ - * /`.
- **Whitespace:** the ASCII space, tab, line feed, carriage return, form
  feed, and vertical tab only. Other Unicode spaces, such as a non-breaking
  space, are not whitespace (D17).

A byte-order mark (U+FEFF) that is the very first character of the source
SHALL be ignored. It takes no column, so the character after it is at line 1,
column 1. A byte-order mark anywhere else is not ignored (D17).

Comments and whitespace separate tokens and are otherwise ignored. Any other
character, an unterminated block comment, or a malformed number SHALL be a
syntax error. Line numbers SHALL count `\n` line breaks, with `\r\n` counted as
one line break. Columns SHALL count characters (Unicode code points) from 1:
a tab counts as one character, and so does a character outside the Basic
Multilingual Plane, such as an emoji.

An unexpected character SHALL be reported at its position, with a message
that names it (D17). `XXXX` is its code point in uppercase hexadecimal, with
at least four digits:
- **A visible ASCII character:** `unexpected character 'X'`, for example
  `unexpected character '$'`.
- **A visible non-ASCII character:** `unexpected character 'X' (U+XXXX)`,
  for example `unexpected character 'é' (U+00E9)`.
- **An invisible character**, meaning one in the Unicode categories Zs, Zl,
  Zp, Cc, or Cf (spaces, line and paragraph separators, control characters,
  and format characters): `unexpected character U+XXXX`, followed by
  ` (name)` when the character has a name in this list:

  | Code point | Name |
  | --- | --- |
  | U+00A0 | no-break space |
  | U+00AD | soft hyphen |
  | U+2002 | en space |
  | U+2003 | em space |
  | U+2009 | thin space |
  | U+200B | zero-width space |
  | U+200C | zero-width non-joiner |
  | U+200D | zero-width joiner |
  | U+2028 | line separator |
  | U+2029 | paragraph separator |
  | U+202F | narrow no-break space |
  | U+2060 | word joiner |
  | U+3000 | ideographic space |
  | U+FEFF | byte-order mark |

#### Scenario: Comments are ignored
- **WHEN** a valid source has `// note` and `/* multi\nline */` comments added between statements
- **THEN** it produces the same scene as without the comments

#### Scenario: Exponent numbers are rejected
- **WHEN** the source contains `let a = 1e3;`
- **THEN** a syntax error is reported at the start of `1e3`

#### Scenario: Unterminated block comment
- **WHEN** a `/*` comment starting at line 2, column 1 is never closed
- **THEN** one syntax error is reported at line 2, column 1

#### Scenario: Columns count characters
- **WHEN** the source is `/*😀*/ sphere(0);` with a camera
- **THEN** the radius diagnostic is reported at column 14, because the emoji counts as one column

#### Scenario: Oversized literals are rejected
- **WHEN** a number literal is `1` followed by 400 zeros
- **THEN** a syntax error at its start says the number is too large

#### Scenario: A leading byte-order mark is ignored
- **WHEN** a valid source is preceded by one U+FEFF
- **THEN** it produces the same scene, with no diagnostics, and a diagnostic in it is reported at the same line and column as without the mark

#### Scenario: A byte-order mark elsewhere is an unexpected character
- **WHEN** a U+FEFF appears after the first character of the source, or two appear at its start
- **THEN** a syntax error at the one that is not first says `unexpected character U+FEFF (byte-order mark)`

#### Scenario: Non-ASCII letters are not identifier characters
- **WHEN** the source contains `let é = 1;`
- **THEN** a syntax error at `é` says `unexpected character 'é' (U+00E9)`

#### Scenario: Unicode spaces are not whitespace
- **WHEN** the source contains `sphere(` followed by a non-breaking space and `5);`
- **THEN** a syntax error at the non-breaking space says `unexpected character U+00A0 (no-break space)`

#### Scenario: An invisible character without a name shows its code point
- **WHEN** the source contains the control character U+0007 outside a comment
- **THEN** a syntax error at it says `unexpected character U+0007`

#### Scenario: Characters outside the Basic Multilingual Plane
- **WHEN** the source contains `😀` outside a comment
- **THEN** a syntax error at it says `unexpected character '😀' (U+1F600)`
