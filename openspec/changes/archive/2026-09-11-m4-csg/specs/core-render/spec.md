## MODIFIED Requirements

### Requirement: Render source to an RGBA image
Source: DESIGN §7 (scripted test support).

The core SHALL expose a render function. It takes source text and a positive
integer `width` and `height`, and returns the diagnostics plus either:
- an RGBA buffer of exactly `width × height × 4` bytes, row-major with the
  top row first, when there are no diagnostics; or
- no buffer, when there is any diagnostic.

It SHALL run under Node without browser APIs.

#### Scenario: Core render is callable without a browser
- **WHEN** the bored-cube source and a size of 64 × 48 are rendered from a Node test
- **THEN** there are no diagnostics, the buffer is 64 × 48 × 4 bytes, and it matches the golden image `bored-cube` within 1 per channel

#### Scenario: Invalid source returns diagnostics and no image
- **WHEN** a source has a syntax error at line 2, column 5
- **THEN** the result has one diagnostic at line 2, column 5, and no buffer

#### Scenario: Camera-only source renders the background
- **WHEN** a source with only a valid camera is rendered
- **THEN** every pixel is `[31, 31, 36, 255]`
