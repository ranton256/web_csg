## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Page layout and initial render
Source: DESIGN §4 (layout); DESIGN §5 (render resolution).

The app page SHALL have the title `Web CSG` and contain:
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

## REMOVED Requirements

### Requirement: Re-render on every edit
**Reason**: M1's temporary synchronous trigger is replaced by the debounced, progressive rebuild DESIGN specifies.
**Migration**: See `live-rebuild` (debounce, progressive and cancelable rendering, resize) and `stale-preview` (keeping the last valid image, and the stale indicator).
