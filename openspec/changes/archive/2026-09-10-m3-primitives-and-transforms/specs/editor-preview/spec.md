## MODIFIED Requirements

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
