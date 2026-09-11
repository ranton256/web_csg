# editor-preview Specification

## Purpose

The in-browser page: a source editor with a line-number gutter, clickable
diagnostics, and two-space Tab indentation, beside a preview panel that fills
the rest of the window, with a draggable divider between them, and a header
toolbar with Open…, Save, an Examples… picker, and Help. Rebuild timing and
the stale state are specified in `live-rebuild` and `stale-preview`, the help
dialog in `language-help`, and the file and example controls in
`save-load-and-examples`.

## Requirements

### Requirement: Page layout and initial render
Source: DESIGN §4 (layout); DESIGN §5 (render resolution); DESIGN §12 D23 (the Help button), D6 and D26 (the file and example controls).

The app page SHALL have the title `Web CSG`, and a header with a toolbar
holding an "Open…" button, a "Save" button, an "Examples…" picker (see
`save-load-and-examples`), and a "Help" button (see `language-help`). It
SHALL contain:
- **Editor:** a `<textarea>` prefilled with the saved source, or on first
  launch with the bored-cube example (see `save-load-and-examples`), a
  line-number gutter, and the diagnostics list.
- **Divider:** the vertical divider.
- **Preview panel:** it fills the rest of the window and contains:
  - a canvas whose pixel size equals the panel's CSS size (one ray per CSS
    pixel; `devicePixelRatio` is ignored);
  - a stale indicator;
  - a "Rendering…" status.

On load, it SHALL render the editor's source into the canvas using the core
renderer.

#### Scenario: The example renders on load
- **WHEN** the page is opened with no saved source in Chromium, Firefox, or WebKit
- **THEN** the canvas's pixel size equals the preview panel's CSS size
- **AND** once rendering finishes, the canvas center pixel is not the background `[31, 31, 36]`, and the top-left pixel is the background
- **AND** the diagnostics list is empty, the stale indicator is hidden, and no console or page errors occur

#### Scenario: The header has a Help button
- **WHEN** the page is opened
- **THEN** the header contains a visible, keyboard-focusable button labeled "Help"

#### Scenario: The header has the file and example controls
- **WHEN** the page is opened
- **THEN** the header contains visible, keyboard-focusable "Open…" and "Save" buttons, and an "Examples…" picker

### Requirement: Line-number gutter
Source: DESIGN §8 Live rebuild and progressive rendering ("a plain
`<textarea>` with a line-number gutter").

Beside the text area, a gutter SHALL show one line number for each source
line, from 1. It SHALL update as lines are added or removed, and stay
vertically aligned with the text when the text area scrolls. Lines SHALL NOT
wrap in the text area, so each gutter number matches exactly one source line.

#### Scenario: Numbers follow the line count
- **WHEN** the source is edited to have 12 lines
- **THEN** the gutter shows the numbers 1 to 12

#### Scenario: The gutter scrolls with the text
- **WHEN** a 200-line source is scrolled to the bottom of the text area
- **THEN** the gutter's scroll offset equals the text area's, and the last visible number is 200

### Requirement: Clicking a diagnostic moves the caret
Source: DESIGN §8 Live rebuild and progressive rendering.

Each entry in the diagnostics list SHALL show `line:column message`. Clicking
an entry SHALL focus the text area and place the caret at that line and
column, counting columns in characters, as diagnostics do.

#### Scenario: Clicking a diagnostic moves the caret
- **WHEN** a diagnostic at line 4, column 7 is clicked
- **THEN** the text area has focus, and the caret is at line 4, column 7

#### Scenario: Columns after an emoji
- **WHEN** the source's first line is `/*😀*/ sphere(0);` and its radius diagnostic (column 14) is clicked
- **THEN** the caret is placed immediately before the `0`

### Requirement: Draggable divider
Source: DESIGN §4 (layout; divider agreed 2026-09-10); DESIGN §5 (divider
sizes, D18).

A vertical divider between the editor and the preview SHALL set their widths:
- **Initial layout:** the editor starts 420 px wide; the preview fills the
  rest of the window.
- **Pointer:** dragging the divider moves it with the pointer.
- **Keyboard:** the divider is focusable, and ArrowLeft and ArrowRight move it
  16 px.
- **Limits:** the editor and the preview are each kept at least 240 px wide.
  When the window is too narrow for both minimums, the editor keeps its
  240 px and the preview gets the remaining width.

Every change of the preview's size, from the divider or the window, SHALL be
handled by the resize rule in `live-rebuild`.

#### Scenario: Dragging the divider
- **WHEN** the divider is dragged 100 px to the right
- **THEN** the editor is 100 px wider and the preview 100 px narrower

#### Scenario: The divider is clamped
- **WHEN** the divider is dragged far to the left, and then far to the right
- **THEN** the editor stops at 240 px wide, and then the preview stops at 240 px wide

#### Scenario: Keyboard control
- **WHEN** the divider has focus and ArrowRight is pressed twice
- **THEN** the editor is 32 px wider

#### Scenario: A window too narrow for both minimums
- **WHEN** the window is 400 px wide
- **THEN** the editor is 240 px wide, and the preview takes the rest of the width beside the 6 px divider

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
this; a modifier key (Shift, Control, Alt, or Meta) pressed on its own does
not, so Esc then Shift+Tab also moves focus.

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

#### Scenario: Esc, then Shift+Tab, also leaves the editor
- **WHEN** the text area has focus, Esc is pressed, and then Shift+Tab is pressed
- **THEN** focus moves to the previous focusable element on the page, and the source text is unchanged

#### Scenario: Esc, then Tab, leaves the editor
- **WHEN** the text area has focus, Esc is pressed, and then Tab is pressed
- **THEN** focus moves to the next focusable element on the page, and the source text is unchanged

#### Scenario: An indentation edit rebuilds and can be undone
- **WHEN** Tab inserts two spaces
- **THEN** a rebuild follows, as for typed text
- **AND** undo leaves exactly the text that undo leaves after typing the same two spaces in the same place; in Chromium and Firefox, that is the text as it was before the Tab
