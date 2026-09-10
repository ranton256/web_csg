## MODIFIED Requirements

### Requirement: Resize re-render
Source: DESIGN §8 Live rebuild and progressive rendering; §8 Camera definition
("Resizing preserves vertical field of view"); §5 (resize debounce, render
resolution).

When the preview panel changes size, from the window or the divider, a new
render at the new size SHALL start 150 ms after the last size change. The
canvas pixel size SHALL follow the panel's CSS size, and the vertical field of
view SHALL be preserved: the horizontal extent follows the new aspect ratio.
A render in progress when the new render starts SHALL be cancelled.

#### Scenario: Resize re-renders after the debounce
- **WHEN** the preview panel is resized
- **THEN** a new render starts 150 ms after the last resize event, at the new size

#### Scenario: Resizing preserves vertical field of view
- **WHEN** only the preview's width changes, and a sphere is centered in view
- **THEN** after re-rendering, the sphere covers the same number of pixel rows and columns as before

#### Scenario: A resize during a render restarts it at the new size
- **WHEN** a render is in progress and the preview panel is resized
- **THEN** that render is cancelled, and a new render at the new size runs to completion. Its image equals a full render at that size
