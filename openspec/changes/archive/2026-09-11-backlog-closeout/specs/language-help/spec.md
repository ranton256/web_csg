## Purpose

Gives users an on-request reference for the modeling language inside the
app, so they can check syntax, parameters, and defaults without leaving the
editor.

## ADDED Requirements

### Requirement: Help opens on request and returns focus
Source: DESIGN §4 (layout); DESIGN §8 Editor indentation and help; DESIGN §12 D23 (the owner's decisions, 2026-09-11).

Activating the header's "Help" button, by click or keyboard, SHALL open a
modal dialog titled "Modeling language help":
- **While open:** it has keyboard focus, and the page behind it cannot be
  interacted with.
- **Closing:** Esc, or the dialog's "Close" button, SHALL close it.
- **Focus:** closing SHALL return focus to the element that had focus when
  the dialog opened.
- **No side effects:** opening and closing the dialog SHALL NOT change the
  source text, the caret, the diagnostics, or the preview, and SHALL NOT
  trigger a rebuild.

#### Scenario: Opening and closing with the keyboard
- **WHEN** the Help button has focus and Enter is pressed
- **THEN** the dialog is open and has focus
- **AND** after Esc is pressed, the dialog is closed and the Help button has focus again

#### Scenario: Closing with the Close button
- **WHEN** the dialog is open and its Close button is activated
- **THEN** the dialog is closed

#### Scenario: Help does not disturb the editor
- **WHEN** the dialog is opened and closed while the editor holds unsaved source with the caret at line 3, column 5
- **THEN** the source text, the caret position, and the rebuild count are unchanged

### Requirement: Help covers the whole language
Source: DESIGN §8 Modeling language, Camera definition, Lighting and shading, Primitives, Transforms, and Boolean operations; DESIGN §5 (parameters and defaults).

The dialog SHALL describe:
- comments, statements, and `let` bindings;
- the primitives `sphere`, `cube`, `box`, and `cylinder`, with their
  parameters in order;
- the transforms `translate`, `rotate`, and `scale`, each with its one
  argument, and the rotation convention (degrees; X, then Y, then Z);
- the Booleans `union`, `intersection`, and `difference`, including that a
  difference subtracts all later children from the first;
- the `camera`, `light`, and `material` blocks, with their properties and
  defaults.

It SHALL include a short example source that compiles with no diagnostics.
Its content SHALL mention every reserved word of the language.

#### Scenario: Every reserved word is covered
- **WHEN** the help content is checked against the language's reserved words (`let`, `camera`, `light`, `material`, `sphere`, `cube`, `box`, `cylinder`, `translate`, `rotate`, `scale`, `union`, `intersection`, `difference`)
- **THEN** each word appears in the help content

#### Scenario: The help example is valid
- **WHEN** the help's example source is compiled
- **THEN** there are no diagnostics, and it renders a non-empty image
