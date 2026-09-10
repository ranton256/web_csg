# editor-preview Specification

## Purpose

The in-browser page: a source editor beside a rendered preview, with
diagnostics shown for invalid source. This change delivers the minimal M1
page. M2 replaces the rebuild trigger with the debounced, progressive,
stale-marked editor.

## Requirements

### Requirement: Page layout and initial render
Source: DESIGN §4 (layout: source editor plus preview panel); ROADMAP M1.

The app page SHALL have the title `Web CSG` and contain:
- a `<textarea>` prefilled with a sphere example (a camera, and one `sphere`
  using a `let` binding);
- a canvas of 640 × 480 pixels;
- a diagnostics list.

On load, it SHALL render the example into the canvas using the core render
function, one ray per canvas pixel.

#### Scenario: The example renders on load
- **WHEN** the page is opened in Chromium, Firefox, or WebKit
- **THEN** the canvas center pixel is not the background `[31, 31, 36]`, and the top-left pixel is the background
- **AND** the diagnostics list is empty, and no console or page errors occur

### Requirement: Re-render on every edit
Source: ROADMAP M1 (temporary trigger; replaced in M2).

Every edit to the text area SHALL synchronously re-evaluate the source.
- **Valid source:** the canvas SHALL show the new render, and the diagnostics
  list SHALL be empty.
- **Invalid source:** the diagnostics list SHALL show each diagnostic as
  `line:column message`, and the canvas SHALL keep the last valid image.

#### Scenario: A valid edit updates the image
- **WHEN** the sphere's radius is changed from 40 to 60 in the text area
- **THEN** the canvas shows a larger sphere: more non-background pixels than before

#### Scenario: An invalid edit keeps the image and lists the error
- **WHEN** the source is edited to contain `sphere(0);` on line 8
- **THEN** the diagnostics list shows an entry beginning `8:` that says the radius must be greater than 0
- **AND** the canvas pixels are unchanged from the last valid render

#### Scenario: Fixing the error clears the list
- **WHEN** the error is corrected
- **THEN** the diagnostics list is empty, and the canvas shows the corrected render
