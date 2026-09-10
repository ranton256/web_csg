## Purpose

Turns Web CSG source text into a validated scene or a list of positioned
diagnostics. This change covers the M1 subset: comments, numbers, unary minus,
vectors, names, `let`, `camera`, and `sphere`. Later milestones extend it.

## ADDED Requirements

### Requirement: Lexical structure
Source: DESIGN §8 Modeling language.

The language SHALL recognize:
- **Comments:** `//` to the end of the line, and `/* … */` block comments,
  which do not nest.
- **Numbers:** decimal numbers made of digits with an optional fraction
  (`12`, `1.5`, `0.5`). There is no exponent form, and no leading or trailing
  bare `.`. A literal too large to represent as a finite number is an error.
- **Identifiers:** a letter or `_`, then letters, digits, or `_`.
- **Reserved words:** `let`, `camera`, `light`, `material`, `sphere`, `cube`,
  `box`, `cylinder`, `translate`, `rotate`, `scale`, `union`, `intersection`,
  `difference`.
- **Punctuation:** `; : , = { } ( ) [ ]` and `-`. Also `+ * /`, which are
  recognized only so that binary arithmetic can be reported as not supported
  yet.

Comments and whitespace separate tokens and are otherwise ignored. Any other
character, an unterminated block comment, or a malformed number SHALL be a
syntax error. Line numbers SHALL count `\n` line breaks, with `\r\n` counted as
one line break. Columns SHALL count characters (Unicode code points) from 1:
a tab counts as one character, and so does a character outside the Basic
Multilingual Plane, such as an emoji.

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

### Requirement: Statements of the M1 subset
Source: DESIGN §8 Modeling language.

A source SHALL be a sequence of top-level statements:
- `let name = expression;`
- `camera { … }`
- `sphere( arguments );`

Statements SHALL end with `;`, except block statements, which end with `}`.

#### Scenario: Missing semicolon
- **WHEN** the source contains `let r = 5` followed on the next line by `sphere(r);`
- **THEN** a syntax error is reported at the token `sphere`, saying a `;` was expected

### Requirement: Expressions of the M1 subset
Source: DESIGN §8 Modeling language.

An expression SHALL be one of:
- a number
- a name
- a vector `[a, b, c]` of exactly three expressions, each evaluating to a number
- unary minus applied to an expression

Unary minus SHALL negate a number, or each component of a vector. Binary
operators (`+ - * /` between operands) and parentheses SHALL produce a
diagnostic saying they are not supported yet, at the operator or parenthesis.

#### Scenario: Unary minus on numbers and vectors
- **WHEN** the source contains `let d = 100; let v = -[1, 2, 3]; let w = [d, -d, d];`
- **THEN** `v` is `[-1, -2, -3]` and `w` is `[100, -100, 100]`

#### Scenario: Vector elements must be numbers
- **WHEN** the source contains `let v = [1, [2, 3, 4], 5];`
- **THEN** a diagnostic at the inner `[` says vector elements must be numbers

#### Scenario: Vectors have exactly three elements
- **WHEN** the source contains `let v = [1, 2];`
- **THEN** a syntax error is reported

#### Scenario: Binary arithmetic is not supported yet
- **WHEN** the source contains `let a = 1 + 2;`
- **THEN** a diagnostic at `+` says binary arithmetic is not supported yet

### Requirement: Bounded expression nesting
Source: DESIGN §5 (maximum expression nesting depth, decision D15).

Expressions SHALL nest at most 100 levels, counting each unary minus and each
vector bracket. A deeper expression SHALL be a syntax error at the token that
exceeds the limit. However deep the input, compiling SHALL return
diagnostics rather than crash.

#### Scenario: One hundred levels are allowed
- **WHEN** the source contains `let a = ` followed by 100 minus signs and `1;`
- **THEN** there is no nesting diagnostic

#### Scenario: The 101st level is an error
- **WHEN** the source contains `let a = ` followed by 101 minus signs and `1;`
- **THEN** a syntax error at the 101st `-` says expressions are nested too deeply

#### Scenario: Pathological depth does not crash
- **WHEN** the source contains 10,000 minus signs, or 5,000 nested `[`
- **THEN** compiling returns a nesting diagnostic instead of throwing

### Requirement: Immutable let bindings with lexical scope
Source: DESIGN §8 Modeling language.

`let name = expression;` SHALL bind an immutable number or vector. The name is
visible from after its declaration to the end of the enclosing block; at the
top level, that is the rest of the file. Using a name that is not visible, or
declaring a name that is already visible (shadowing), SHALL be an error.

#### Scenario: A name is visible only after its declaration
- **WHEN** the top level contains `sphere(r); let r = 5;`
- **THEN** a diagnostic at the use of `r` says `r` is undeclared

#### Scenario: Redeclaration is an error
- **WHEN** the source contains `let r = 5;` and later `let r = 6;`
- **THEN** a diagnostic at the second `r` says `r` is already declared

#### Scenario: Reserved words are not names
- **WHEN** the source contains `let camera = 1;`
- **THEN** a syntax error is reported at `camera`

### Requirement: Primitive call arguments
Source: DESIGN §8 Modeling language (primitive calls), §5 (parameter order).

Arguments to a primitive SHALL be positional (in the parameter order from
DESIGN §5) or named (`name: expression`). The rules:
- Positional arguments come before named ones.
- Each parameter is given exactly once.
- Every parameter is required.
- Unknown parameter names are errors.

A positional argument after a named one SHALL be reported at that argument.

#### Scenario: Positional and named arguments are equivalent
- **WHEN** one source contains `sphere(12);` and another `sphere(radius: 12);`, otherwise identical
- **THEN** they produce the same scene

#### Scenario: Positional argument after a named one
- **WHEN** the source contains `sphere(radius: 12, 5);`
- **THEN** a diagnostic at `5` says positional arguments must come before named arguments

#### Scenario: Missing, duplicate, and unknown arguments
- **WHEN** the source contains `sphere();`, or `sphere(1, radius: 2);`, or `sphere(r: 5);`
- **THEN** a diagnostic identifies, respectively, the missing parameter `radius`, the duplicated parameter `radius`, or the unknown parameter `r`

### Requirement: Constructs not yet supported
Source: ROADMAP milestone order (DESIGN §8 features delivered in M2–M6).

The reserved words `cube`, `box`, `cylinder`, `translate`, `rotate`, `scale`,
`union`, `intersection`, `difference`, `light`, and `material` SHALL produce a
diagnostic at their location saying the construct is not supported yet. They
SHALL NOT crash or be ignored.

#### Scenario: A later primitive is rejected clearly
- **WHEN** the source contains `cube(10);` at line 5, column 1
- **THEN** a diagnostic at line 5, column 1 says `cube` is not supported yet

### Requirement: Diagnostics
Source: DESIGN §8 Modeling language (diagnostics).

Each diagnostic SHALL have a 1-based line, a 1-based column (the start of the
offending token), and a message. Parsing SHALL stop at the first syntax error
and report exactly that one. When parsing succeeds, evaluation SHALL report
every semantic error it finds, ordered by position. That includes errors
inside a second, rejected camera block. A source with any diagnostic SHALL
produce no scene.

#### Scenario: Parsing stops at the first syntax error
- **WHEN** a source has syntax errors on lines 3 and 7
- **THEN** exactly one diagnostic is reported, on line 3

#### Scenario: All semantic errors are reported
- **WHEN** a syntactically valid source uses undeclared names on lines 4 and 9
- **THEN** diagnostics are reported for both line 4 and line 9, in that order

### Requirement: Empty scene
Source: DESIGN §8 Modeling language (empty scene).

A source with a valid camera and no solids SHALL be valid and produce a scene
with no solids.

#### Scenario: Camera-only source is valid
- **WHEN** a source contains only a valid camera block
- **THEN** there are no diagnostics, and the scene has no solids
