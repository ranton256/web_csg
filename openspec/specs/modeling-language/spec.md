# modeling-language Specification

## Purpose

Turns Web CSG source text into a validated scene or a list of positioned
diagnostics. The grammar is complete; constructs whose semantics arrive in
later milestones parse, have their contents checked, and are reported as not
supported yet.

## Requirements

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
- **Punctuation:** `; : , = { } ( ) [ ]` and the operators `+ - * /`.

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

### Requirement: Statements
Source: DESIGN §8 Modeling language (statements, transforms, Booleans,
bodies, property blocks).

A source SHALL be a sequence of statements. The statement forms are:
- **Binding:** `let name = expression;`
- **Property blocks:** `camera { … }`, `light { … }`, `material { … }`, each
  containing `name: expression;` entries.
- **Primitive calls:** `sphere( arguments );`, `cube( … );`, `box( … );`,
  `cylinder( … );`.
- **Transform blocks:** `translate( arguments ) { body }`,
  `rotate( arguments ) { body }`, `scale( arguments ) { body }`. The braced
  body is required, and transforms are not chained (nest blocks instead).
- **Boolean blocks:** `union { body }`, `intersection { body }`,
  `difference { body }`.

A body SHALL be a sequence of statements. Statements SHALL end with `;`,
except blocks, which end with `}`.

#### Scenario: Missing semicolon
- **WHEN** the source contains `let r = 5` followed on the next line by `sphere(r);`
- **THEN** a syntax error is reported at the token `sphere`, saying a `;` was expected

#### Scenario: A transform requires a braced body
- **WHEN** the source contains `translate([1, 0, 0]) sphere(1);`
- **THEN** a syntax error at `sphere` says a `{` was expected

#### Scenario: Transforms are not chained
- **WHEN** the source contains `translate([1, 0, 0]) rotate([0, 0, 90]) { sphere(1); }`
- **THEN** a syntax error at `rotate` says a `{` was expected

#### Scenario: The vision example parses
- **WHEN** the bored-cube source from `vision.md` is compiled
- **THEN** there are no diagnostics, and the model is a cube of size 60 minus the union of three cylinders of radius 12 and height 62

### Requirement: Expressions
Source: DESIGN §8 Modeling language (vectors, arithmetic, precedence).

An expression SHALL be one of:
- a number
- a name
- a vector `[a, b, c]` of exactly three expressions, each evaluating to a number
- a parenthesized expression
- unary minus applied to an expression
- a binary `+`, `-`, `*`, or `/` of two expressions

Unary minus SHALL bind tightest, then `*` and `/`, then `+` and `-`. Binary
operators SHALL be left-associative. Unary minus SHALL negate a number, or
each component of a vector.

The permitted operand combinations SHALL be:
- number ∘ number, for all four operators;
- vector ± vector;
- vector × number, and number × vector;
- vector ÷ number.

Any other combination SHALL be an error at the operator, naming the operand
kinds. Dividing by zero, whether a number or a vector is divided, SHALL be an
error at the `/`. A result too large to represent as a finite number SHALL be
an error at the operator, so that no Infinity reaches a scene (the same rule
as for oversized literals).

#### Scenario: Unary minus on numbers and vectors
- **WHEN** the source contains `let d = 100; let v = -[1, 2, 3]; let w = [d, -d, d];`
- **THEN** `v` is `[-1, -2, -3]` and `w` is `[100, -100, 100]`

#### Scenario: Vector elements must be numbers
- **WHEN** the source contains `let v = [1, [2, 3, 4], 5];`
- **THEN** a diagnostic at the inner `[` says vector elements must be numbers

#### Scenario: Vectors have exactly three elements
- **WHEN** the source contains `let v = [1, 2];`
- **THEN** a syntax error is reported

#### Scenario: Precedence and associativity
- **WHEN** the source contains `let a = 2 + 3 * 4 - 6 / 2;`, `let b = 10 - 4 - 3;`, `let c = 12 / 2 / 3;`, `let d = (2 + 3) * 4;`, and `let e = -2 * 3;`
- **THEN** `a` is 11, `b` is 3, `c` is 2, `d` is 20, and `e` is -6

#### Scenario: Vector arithmetic
- **WHEN** the source contains `let v = [1, 2, 3] * 2 + [1, 1, 1];`, `let w = 2 * [1, 2, 3];`, and `let u = [2, 4, 6] / 2;`
- **THEN** `v` is `[3, 5, 7]`, `w` is `[2, 4, 6]`, and `u` is `[1, 2, 3]`

#### Scenario: Invalid operand kinds are errors at the operator
- **WHEN** the source contains `let v = [1, 2, 3] * [1, 2, 3];`, or `let w = 1 + [1, 2, 3];`, or `let u = 2 / [1, 2, 3];`
- **THEN** a diagnostic at the operator names the invalid operand kinds

#### Scenario: Division by zero is an error
- **WHEN** the source contains `let a = 1 / (2 - 2);` or `let v = [1, 2, 3] / 0;`
- **THEN** a diagnostic at the `/` reports division by zero

#### Scenario: Arithmetic overflow is an error
- **WHEN** two literals each of `1` followed by 200 zeros are multiplied
- **THEN** a diagnostic at the `*` says the result is too large

### Requirement: Empty bodies
Source: DESIGN §8 Modeling language (bodies need at least one solid).

Every transform or Boolean body SHALL contain at least one solid: a primitive
call, or a nested transform or Boolean block. A body with no solid SHALL be an
error at the block's keyword, saying the block contains no solids. A body may
also contain `let` statements.

#### Scenario: Empty body is an error
- **WHEN** the source contains `union { }` or `translate([1, 0, 0]) { let a = 1; }`
- **THEN** a diagnostic at the block's keyword says the block contains no solids

### Requirement: Bounded expression nesting
Source: DESIGN §5 (maximum nesting depth; decisions D15 and D18).

Expressions and block bodies SHALL nest at most 100 levels, counting each
unary minus, each vector bracket, each parenthesis (including the
parentheses around a call's or transform's arguments), and each transform or
Boolean body. Nesting deeper than that SHALL be a syntax error at the token
that exceeds the limit. Chains of binary operators at the same level (such as
`1 + 1 + … + 1`) are not nesting and SHALL be accepted at any length.
However deep or long the input, compiling SHALL return diagnostics or a scene
rather than crash.

#### Scenario: One hundred levels are allowed
- **WHEN** the source contains `let a = ` followed by 100 minus signs and `1;`
- **THEN** there is no nesting diagnostic

#### Scenario: The 101st level is an error
- **WHEN** the source contains `let a = ` followed by 101 minus signs and `1;`
- **THEN** a syntax error at the 101st `-` says expressions are nested too deeply

#### Scenario: Pathological depth does not crash
- **WHEN** the source contains 10,000 minus signs, or 5,000 nested `[`
- **THEN** compiling returns a nesting diagnostic instead of throwing

#### Scenario: Parentheses and bodies count as levels
- **WHEN** the source contains 101 nested `(`, or 101 nested `union {` bodies
- **THEN** a syntax error at the 101st `(` or `union` says it is nested too deeply

#### Scenario: Long operator chains are not nesting
- **WHEN** the source contains `let a = 1` followed by 100,000 repetitions of ` + 1` and `;`
- **THEN** it compiles without a nesting diagnostic or a crash, and `a` is 100001

#### Scenario: Argument parentheses count as a level
- **WHEN** the source contains `sphere(` followed by 99 minus signs and `1);`, and separately `sphere(` followed by 100 minus signs and `1);`
- **THEN** the first has no nesting diagnostic, and the second is a syntax error at the 100th `-` saying expressions are nested too deeply

### Requirement: Immutable let bindings with lexical scope
Source: DESIGN §8 Modeling language.

`let name = expression;` SHALL bind an immutable number or vector. The name is
visible from after its declaration to the end of the enclosing block; at the
top level, that is the rest of the file. Using a name that is not visible, or
declaring a name that is already visible (shadowing), SHALL be an error.
These rules apply inside transform and Boolean bodies.

#### Scenario: A name is visible only after its declaration
- **WHEN** the top level contains `sphere(r); let r = 5;`
- **THEN** a diagnostic at the use of `r` says `r` is undeclared

#### Scenario: Redeclaration is an error
- **WHEN** the source contains `let r = 5;` and later `let r = 6;`
- **THEN** a diagnostic at the second `r` says `r` is already declared

#### Scenario: Reserved words are not names
- **WHEN** the source contains `let camera = 1;`
- **THEN** a syntax error is reported at `camera`

#### Scenario: let is scoped to its block
- **WHEN** the source contains `union { let r = 5; sphere(r); } sphere(r);`
- **THEN** a diagnostic at the second use of `r` says `r` is undeclared, and there is none at the first

#### Scenario: Shadowing inside a block is an error
- **WHEN** the source contains `let r = 5; union { let r = 6; sphere(r); }`
- **THEN** a diagnostic at the inner `r` says `r` is already declared

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

#### Scenario: Cylinder arguments in any order when named
- **WHEN** one source contains `cylinder(12, 62);` and another `cylinder(height: 62, radius: 12);`, otherwise identical
- **THEN** they produce the same scene

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

### Requirement: Lights and materials are not supported yet
Source: ROADMAP milestone order (DESIGN §8 Lighting and shading, delivered in M5).

The property blocks `light` and `material` SHALL parse fully. The evaluator
SHALL report a diagnostic at each one's keyword saying it is not supported
yet. Their property expressions SHALL still be checked, so every other error
in them is also reported (names, arithmetic). They SHALL NOT crash or be
ignored.

#### Scenario: A light or material block is rejected clearly
- **WHEN** the source contains `light { direction: [0, 0, 1]; }` at line 5, column 1
- **THEN** a diagnostic at line 5, column 1 says `light` is not supported yet

#### Scenario: Contents of an unsupported construct are still checked
- **WHEN** the source contains `light { direction: [0, 0, q]; }` and `material { color: 1 + [1, 2, 3]; }`
- **THEN** diagnostics say `light` and `material` are not supported yet, `q` is undeclared, and `+` has invalid operand kinds
