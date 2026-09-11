## ADDED Requirements

### Requirement: Booleans, lights, and materials are not supported yet
Source: ROADMAP milestone order (DESIGN §8 features delivered in M4–M5).

The constructs `union`, `intersection`, `difference`, `light`, and `material`
SHALL parse fully. The evaluator SHALL report a diagnostic at each one's
keyword saying it is not supported yet. Their contents SHALL still be
checked, so every other error in them is also reported: property and
argument expressions (names, arithmetic), let scopes in bodies, the
empty-body rule, and the primitives and transforms inside them. They SHALL
NOT crash or be ignored.

#### Scenario: A Boolean block is rejected clearly
- **WHEN** the source contains `union { sphere(1); }` at line 5, column 1
- **THEN** a diagnostic at line 5, column 1 says `union` is not supported yet

#### Scenario: Contents of an unsupported construct are still checked
- **WHEN** the source contains `union { sphere(q); }` and `material { color: 1 + [1, 2, 3]; }`
- **THEN** diagnostics say `union` and `material` are not supported yet, `q` is undeclared, and `+` has invalid operand kinds

## MODIFIED Requirements

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
- **THEN** there is no syntax error. The only diagnostics say that `difference` and `union` are not supported yet

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

## REMOVED Requirements

### Requirement: Constructs not yet supported
**Reason**: `cube`, `box`, `cylinder`, `translate`, `rotate`, and `scale` are supported from M3; only Booleans, lights, and materials remain unsupported.
**Migration**: See "Booleans, lights, and materials are not supported yet", and the `primitives` and `transforms` specs.
