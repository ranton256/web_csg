# core-render Specification

## Purpose

Provides the browser-free rendering entry point: source text and a pixel size
in, diagnostics and an RGBA image out. Tests, golden images, and the browser
shell all use it, so scripted runs are reproducible.

## Requirements

### Requirement: Render source to an RGBA image
Source: DESIGN §7 (scripted test support).

The core SHALL expose a render function. It takes source text and a positive
integer `width` and `height`, and returns the diagnostics plus either:
- an RGBA buffer of exactly `width × height × 4` bytes, row-major with the
  top row first, when there are no diagnostics; or
- no buffer, when there is any diagnostic.

It SHALL run under Node without browser APIs.

#### Scenario: Core render is callable without a browser
- **WHEN** the default sphere example and a size of 64 × 48 are rendered from a Node test
- **THEN** there are no diagnostics, the buffer is 64 × 48 × 4 bytes, and it matches the golden image `sphere` within 1 per channel

#### Scenario: Invalid source returns diagnostics and no image
- **WHEN** a source has a syntax error at line 2, column 5
- **THEN** the result has one diagnostic at line 2, column 5, and no buffer

#### Scenario: Camera-only source renders the background
- **WHEN** a source with only a valid camera is rendered
- **THEN** every pixel is `[31, 31, 36, 255]`

### Requirement: Deterministic rendering
Source: DESIGN §8 Camera definition ("depends only on the source and canvas
size"); CONSTRAINTS §3.

The same source and size SHALL always produce byte-identical buffers. No
randomness, time, or environment state SHALL affect the output.

#### Scenario: Repeated renders are identical
- **WHEN** the same source is rendered twice at the same size
- **THEN** the two buffers are byte-identical

### Requirement: Band rendering
Source: DESIGN §8 Live rebuild and progressive rendering (row bands; used
from M2).

The core SHALL let a caller render any contiguous range of rows of a
compiled scene into a caller-provided buffer. Rendering all rows in any split
into bands SHALL produce exactly the same bytes as a single full render.

#### Scenario: Bands equal the full image
- **WHEN** a 64 × 48 image is rendered as rows 0–16, 17–30, and 31–47 into one buffer
- **THEN** the buffer is byte-identical to a single full render
