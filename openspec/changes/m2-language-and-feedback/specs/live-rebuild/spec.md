## Purpose

Keeps the preview in step with the source without getting in the way of
typing: rebuilds after a pause, renders progressively in bands that a newer
model can cancel, and re-renders at the new size when the preview is resized.

## ADDED Requirements

### Requirement: Debounced rebuild
Source: DESIGN §8 Live rebuild and progressive rendering; §5 (rebuild
debounce).

After an edit, the source SHALL be re-parsed and re-evaluated 300 ms after
the last edit, and not before. Each further edit SHALL restart the wait. The
diagnostics list SHALL update when the rebuild happens.

#### Scenario: Edits rebuild after the debounce
- **WHEN** a valid model is displayed, the user types a valid change and then pauses
- **THEN** the model is re-evaluated 300 ms after the last keystroke, and not before

#### Scenario: Each edit restarts the wait
- **WHEN** edits happen at 0 ms and at 200 ms
- **THEN** no rebuild happens at 300 ms, and one rebuild happens at 500 ms

### Requirement: Progressive, cancelable rendering
Source: DESIGN §8 Live rebuild and progressive rendering; DESIGN §5 (render
time slice, D18).

A valid model SHALL be rendered in horizontal row bands, top to bottom, on
the main thread.
- **Slices:** a slice renders whole rows and starts no new row once 12 ms have
  elapsed since it began, then yields to the browser. A slice therefore always
  renders at least one row, and runs at most one row past 12 ms. Each finished
  band appears on the canvas as it completes.
- **Status:** "Rendering…" SHALL be visible while a render is in progress, and
  hidden when it finishes.
- **Cancellation:** a newer valid model, or a resize, SHALL cancel the render
  in progress, which restarts from the first band.
- **Result:** the finished image SHALL be byte-identical to a single full
  render of the same model at the same size.

#### Scenario: Slices stop starting rows after 12 ms
- **WHEN** each row takes 5 ms to render
- **THEN** every slice except possibly the last renders 3 rows (ending at 15 ms). With 25 ms rows each slice renders 1 row, and with 1 ms rows it renders 12

#### Scenario: A newer model cancels an in-progress render
- **WHEN** a render is in progress and a newer valid model is produced
- **THEN** the in-progress render stops, and rendering restarts from the first band with the newer model

#### Scenario: The status shows while rendering
- **WHEN** a render of a large preview starts
- **THEN** "Rendering…" is visible until the last band is drawn, and hidden afterwards

#### Scenario: The progressive result equals a full render
- **WHEN** a progressive render finishes
- **THEN** the canvas pixels equal the core's single full render of the same source at the canvas size

### Requirement: Typing stays responsive while rendering
Source: DESIGN §8 Live rebuild and progressive rendering.

While a render is in progress, keyboard input to the text area SHALL be
handled between slices, not held until the render finishes.

#### Scenario: Typing stays responsive while rendering
- **WHEN** a render of a large preview is in progress and the user types
- **THEN** each keystroke appears in the editor while "Rendering…" is still visible

### Requirement: Resize re-render
Source: DESIGN §8 Live rebuild and progressive rendering; §8 Camera definition
("Resizing preserves vertical field of view"); §5 (resize debounce, render
resolution).

When the preview panel changes size, from the window or the divider, a new
render at the new size SHALL start 150 ms after the last size change. The
canvas pixel size SHALL follow the panel's CSS size, and the vertical field of
view SHALL be preserved: the horizontal extent follows the new aspect ratio.

#### Scenario: Resize re-renders after the debounce
- **WHEN** the preview panel is resized
- **THEN** a new render starts 150 ms after the last resize event, at the new size

#### Scenario: Resizing preserves vertical field of view
- **WHEN** only the preview's width changes, and a sphere is centered in view
- **THEN** after re-rendering, the sphere covers the same number of pixel rows and columns as before
