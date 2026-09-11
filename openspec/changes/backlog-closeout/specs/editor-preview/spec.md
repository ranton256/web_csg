## ADDED Requirements

### Requirement: Tab indentation
Source: DESIGN §8 Editor indentation and help; DESIGN §12 D23 (the owner's decisions, 2026-09-11).

In the source text area, the Tab key SHALL indent instead of moving focus:
- **Tab with no selection:** inserts two spaces at the caret.
- **Tab with a selection inside one line:** replaces the selection with two
  spaces.
- **Tab with a selection spanning several lines:** adds two spaces at the
  start of each line the selection touches. A line counts as touched only
  if the selection includes at least one of its characters, so a selection
  that ends at the very start of a line leaves that line alone.
- **Shift+Tab:** removes up to two leading spaces from each line the caret or
  selection touches.

Focus SHALL stay in the text area after an indentation edit.

Pressing Esc in the text area SHALL make the next Tab or Shift+Tab move
focus as the browser normally does, without editing, so keyboard users are
never trapped (WCAG 2.1.2). Any other key, or leaving the text area, cancels
this.

Indentation edits SHALL be ordinary edits:
- they trigger the rebuild rule in `live-rebuild`;
- the browser's undo SHALL treat each one exactly as it treats typing the
  same characters. A browser that groups consecutive typing into one undo
  step, as WebKit does, groups an indentation edit the same way.

#### Scenario: Tab inserts two spaces
- **WHEN** the source is `sphere(1);` on line 1 and `cube(2);` on line 2, the caret is at the start of line 2, and Tab is pressed
- **THEN** line 2 reads `  cube(2);`, the caret is after the two spaces, and the text area still has focus

#### Scenario: Tab indents every selected line
- **WHEN** lines 1 and 2 are both partly selected and Tab is pressed
- **THEN** both lines start with two more spaces, and line 3 is unchanged

#### Scenario: Shift+Tab removes up to two leading spaces
- **WHEN** the caret is on a line that starts with three spaces, and Shift+Tab is pressed
- **THEN** the line starts with one space

#### Scenario: Esc, then Tab, leaves the editor
- **WHEN** the text area has focus, Esc is pressed, and then Tab is pressed
- **THEN** focus moves to the next focusable element on the page, and the source text is unchanged

#### Scenario: An indentation edit rebuilds and can be undone
- **WHEN** Tab inserts two spaces
- **THEN** a rebuild follows, as for typed text
- **AND** undo leaves exactly the text that undo leaves after typing the same two spaces in the same place; in Chromium and Firefox, that is the text as it was before the Tab

## MODIFIED Requirements

### Requirement: Page layout and initial render
Source: DESIGN §4 (layout); DESIGN §5 (render resolution); DESIGN §12 D23 (the Help button).

The app page SHALL have the title `Web CSG`, a header with a "Help" button
(see `language-help`), and contain:
- **Editor:** a `<textarea>` prefilled with a sphere example (a camera, and
  one `sphere` using a `let` binding), a line-number gutter, and the
  diagnostics list.
- **Divider:** the vertical divider.
- **Preview panel:** it fills the rest of the window and contains:
  - a canvas whose pixel size equals the panel's CSS size (one ray per CSS
    pixel; `devicePixelRatio` is ignored);
  - a stale indicator;
  - a "Rendering…" status.

On load, it SHALL render the example into the canvas using the core renderer.

#### Scenario: The example renders on load
- **WHEN** the page is opened in Chromium, Firefox, or WebKit
- **THEN** the canvas's pixel size equals the preview panel's CSS size
- **AND** once rendering finishes, the canvas center pixel is not the background `[31, 31, 36]`, and the top-left pixel is the background
- **AND** the diagnostics list is empty, the stale indicator is hidden, and no console or page errors occur

#### Scenario: The header has a Help button
- **WHEN** the page is opened
- **THEN** the header contains a visible, keyboard-focusable button labeled "Help"
