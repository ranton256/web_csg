## MODIFIED Requirements

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
