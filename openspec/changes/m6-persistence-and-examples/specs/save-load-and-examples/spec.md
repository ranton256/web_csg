## Purpose

Keeps the user's work across reloads, moves it in and out of the app as
`.csg` text files, and offers built-in examples that teach the modeling
language, without a server or accounts.

## ADDED Requirements

### Requirement: Autosave and restore
Source: DESIGN §8 Save, load, and examples; §12 D6 and D26.

Every change to the editor text SHALL be saved in the browser's
`localStorage`. The text SHALL be saved exactly as it is, valid or not. When
the page is opened and a saved source exists, the editor SHALL contain
exactly that source. It SHALL then be evaluated and rendered as if it had
been typed, with its diagnostics when it is invalid.

When `localStorage` cannot be used (for example, access to it throws), the
app SHALL still start and work normally, without autosave. No error is
reported to the user, and no page error occurs.

#### Scenario: Current source is autosaved and restored on reload
- **WHEN** the user edits the source and then reloads the page in the same browser
- **THEN** the editor contains exactly the edited source, and once rendering finishes the preview shows it

#### Scenario: A loaded file or example is autosaved
- **WHEN** the user opens a file, or chooses an example, and then reloads the page
- **THEN** the editor contains the loaded text

#### Scenario: An invalid source is restored with its diagnostics
- **WHEN** the edited source has an error, and the page is reloaded
- **THEN** the editor contains exactly that source, and the diagnostics list reports the error

#### Scenario: The app works without storage
- **WHEN** access to `localStorage` throws, and the page is opened and edited
- **THEN** the editor shows the bored-cube example, edits rebuild the preview as usual, and no page error occurs

### Requirement: First launch shows the bored cube
Source: DESIGN §8 Save, load, and examples ("First launch shows the bored cube"); §4 asset inventory; §12 D10.

When no saved source exists, the editor SHALL contain the bored-cube example,
and the app SHALL render it.

#### Scenario: First launch shows the bored cube
- **WHEN** the app is opened in a browser with no saved source
- **THEN** the editor contains exactly the bored-cube example, the diagnostics list is empty, and once rendering finishes the preview shows the model

### Requirement: Save downloads the source
Source: DESIGN §8 Save, load, and examples ("Save downloads the source as a .csg file"); §12 D6 and D26.

The "Save" button SHALL download a text file whose contents are exactly the
editor text, valid or not, with no characters added, removed, or converted.
The file name SHALL be:
- the name of the last opened file, when a file has been opened;
- otherwise, the file name of the last loaded example (`bored-cube.csg`,
  `primitives.csg`, or `boolean-operations.csg`);
- otherwise, `model.csg`.

The name SHALL be kept for the page session only: after a reload, Save uses
`model.csg` until a file is opened or an example is loaded (D26 a).

After a Save, the saved text SHALL count as the last loaded text for the
confirmation rule, and it is saved with the source, so this holds after a
reload too.

#### Scenario: Save downloads exactly the editor text
- **WHEN** the editor contains any text, valid or not, including an invalid source, and the user chooses Save
- **THEN** the browser downloads a file whose contents are exactly the editor text

#### Scenario: The save file name
- **WHEN** the user saves on first launch, then after choosing the Primitives example, then after opening a file named `part.csg`
- **THEN** the downloaded files are named `model.csg`, `primitives.csg`, and `part.csg` respectively

#### Scenario: The save file name after a reload
- **WHEN** the user opens a file named `part.csg`, reloads the page, and chooses Save
- **THEN** the downloaded file is named `model.csg`

#### Scenario: A Save is remembered across a reload
- **WHEN** the user edits the source, saves it, reloads the page, and chooses an example
- **THEN** the example replaces the text without a confirmation prompt

#### Scenario: Saved text replaces without a prompt
- **WHEN** the user edits the source, saves it, and then chooses an example
- **THEN** the example replaces the text without a confirmation prompt

### Requirement: Open loads a file
Source: DESIGN §8 Save, load, and examples ("Open loads a .csg file"); §12 D6, D17, D26, and D28.

The "Open…" button SHALL let the user choose a file (`.csg` files are
offered). The chosen file SHALL be read as UTF-8 text. Subject to the
confirmation rule, the editor SHALL then contain exactly that text, except
that each line break (`\r\n`, or a lone `\r`) becomes `\n`, as a text area
stores it (D28). That text SHALL be evaluated and rendered at once, as if it
had been typed, and it becomes the last loaded text. When the user cancels
the file chooser, nothing SHALL change, and no confirmation SHALL be asked.
The same file MAY be chosen again.

#### Scenario: A file with Windows line breaks
- **WHEN** the selected file has `\r\n` line breaks
- **THEN** the editor contains its text with `\n` line breaks, and choosing an example straight afterwards replaces it without a confirmation prompt
- **AND** a Save straight after the Open downloads the text with `\n` line breaks

#### Scenario: Open loads a .csg file
- **WHEN** the user chooses Open and selects a `.csg` file
- **THEN** the editor contains exactly the file's text, the diagnostics list matches that source, and the preview renders it

#### Scenario: A file with a byte-order mark opens cleanly
- **WHEN** the selected file is valid UTF-8 source that begins with a byte-order mark
- **THEN** the source evaluates with no diagnostics

#### Scenario: Cancelling the file chooser changes nothing
- **WHEN** the editor text has been edited, and the user chooses Open but selects no file
- **THEN** the editor text is unchanged, and no confirmation is asked

### Requirement: Built-in examples
Source: DESIGN §8 Save, load, and examples ("Built-in examples"); §4 asset inventory; §12 D6.

The "Examples…" picker SHALL list exactly three examples, in this order:
"Bored cube", "Primitives", and "Boolean operations".
- Choosing one SHALL load its source into the editor, subject to the
  confirmation rule, and evaluate and render it at once.
- After a choice, the picker SHALL show its "Examples…" prompt again, so the
  same example can be chosen again.
- Every built-in example SHALL evaluate with no diagnostics.
- The bored-cube example SHALL be the `vision.md` example: a cube minus three
  orthogonal cylinders.
- The Primitives example SHALL show `sphere`, `cube`, `box`, and `cylinder`
  side by side.
- The Boolean operations example SHALL show `union`, `intersection`, and
  `difference` of the same two solids.

#### Scenario: Built-in examples
- **WHEN** the user opens the examples picker
- **THEN** it lists exactly three examples: Bored cube, Primitives, and Boolean operations
- **AND** choosing one loads its source into the editor
- **AND** every built-in example evaluates with no diagnostics

#### Scenario: The picker resets after a choice
- **WHEN** the user chooses the Primitives example
- **THEN** the picker shows "Examples…" again, and choosing Primitives again reloads it

### Requirement: Confirmation before replacing edited text
Source: DESIGN §8 Save, load, and examples ("Replacing edited text asks for confirmation", "Replacing unedited text does not ask"); §12 D10 and D26.

The last loaded text SHALL be the text of the most recent Open, Save, or
example load. On first launch, it is the bored-cube example. It SHALL be
saved with the autosaved source, so a reload keeps it.

When the user chooses an example, or a file has been chosen with Open:
- if the editor text differs from the last loaded text, the app SHALL ask for
  confirmation with the browser's own confirmation prompt before replacing
  it. Declining SHALL leave the editor text, and the last loaded text,
  unchanged;
- if the editor text equals the last loaded text, the text SHALL be replaced
  without a prompt.

#### Scenario: Replacing edited text asks for confirmation
- **WHEN** the editor text differs from the text of the last Open, Save, or example load, and the user chooses Open or an example
- **THEN** the app asks for confirmation before replacing the text
- **AND** declining leaves the editor text unchanged
- **AND** accepting replaces it

#### Scenario: Replacing unedited text does not ask
- **WHEN** the editor text equals the text of the last Open, Save, or example load, and the user chooses an example
- **THEN** the example replaces the text without a confirmation prompt

#### Scenario: First launch text replaces without a prompt
- **WHEN** the app is opened for the first time and the user chooses the Primitives example
- **THEN** it replaces the bored cube without a confirmation prompt

#### Scenario: The confirmation rule survives a reload
- **WHEN** the user edits the source, reloads the page, and then chooses an example
- **THEN** the app asks for confirmation before replacing the text
