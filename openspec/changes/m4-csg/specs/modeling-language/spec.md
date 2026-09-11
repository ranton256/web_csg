## ADDED Requirements

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
- **THEN** there are no diagnostics, and the model is a cube of size 60 minus the union of three cylinders of radius 12 and height 62

## REMOVED Requirements

### Requirement: Booleans, lights, and materials are not supported yet
**Reason**: M4 delivers `union`, `intersection`, and `difference` (see the `boolean-operations` capability). Only `light` and `material` remain unsupported until M5.
**Migration**: Covered by the ADDED requirement "Lights and materials are not supported yet". Boolean blocks now evaluate and render.
