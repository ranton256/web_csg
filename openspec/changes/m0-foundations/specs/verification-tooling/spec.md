## Purpose

The commands and checks that decide whether Web CSG work is done: the unit
and golden-image suite, cross-engine browser tests, the full gate, milestone
screenshot capture, and the pre-commit hook (CONSTRAINTS §4–§5).

## ADDED Requirements

### Requirement: Unit and golden suite command
`npm test` SHALL run every unit and golden-image test file in the repository
under Node's built-in test runner without a browser. It SHALL exit `0` only
if every test passes, and non-zero otherwise. It SHALL NOT run the browser
end-to-end tests.

#### Scenario: Passing suite
- **WHEN** all unit and golden tests pass and `npm test` is run
- **THEN** it exits with status `0`

#### Scenario: A failing assertion fails the suite
- **WHEN** any unit test assertion fails
- **THEN** `npm test` exits non-zero and names the failing test

### Requirement: Cross-engine browser tests
`npm run test:e2e` SHALL run the end-to-end tests headlessly in Chromium,
Firefox, and WebKit. It SHALL start the dev server itself when one is not
already running on its port. It SHALL exit `0` only if every test passes in
every engine. Tests SHALL NOT be retried automatically.

#### Scenario: App page loads in every engine
- **WHEN** `npm run test:e2e` is run
- **THEN** a test loads `/` in each of Chromium, Firefox, and WebKit
- **AND** asserts that the page title is `Web CSG` and that no console errors or uncaught page errors occurred

#### Scenario: Failure in one engine fails the run
- **WHEN** a test fails in only one engine
- **THEN** `npm run test:e2e` exits non-zero and names that engine

### Requirement: Full gate
`npm run check` SHALL run `npm test` and then `npm run test:e2e`. It SHALL
exit `0` only if both pass. It SHALL run to completion without interactive
input: no prompts, and no report server or browser window left open.

#### Scenario: Gate passes only when both suites pass
- **WHEN** either the unit suite or the e2e suite fails
- **THEN** `npm run check` exits non-zero

#### Scenario: Unattended
- **WHEN** `npm run check` is run with no terminal attached to stdin
- **THEN** it completes and exits without waiting for input

### Requirement: Golden image format
Golden images SHALL be stored under `test/golden/` as binary PPM (`P6`,
maximum value `255`, RGB). Reading a PPM written by the tooling SHALL return
exactly the width, height, and RGB bytes that were written. The alpha channel
is not stored.

#### Scenario: Round trip
- **WHEN** an RGBA buffer is written as a PPM and read back
- **THEN** the width, height, and every R, G, and B value are unchanged

#### Scenario: Malformed file
- **WHEN** a golden file is not a valid `P6` image with maximum value `255`
- **THEN** reading it fails with an error naming the file

### Requirement: Golden image comparison
A golden comparison SHALL pass only when the rendered image has the same width
and height as the golden image and every R, G, and B value differs from the
golden value by at most `1`. On failure, the message SHALL state the golden
name, any size mismatch, the number of pixels that differ by more than `1`,
and the largest channel difference. The actual image SHALL be written to
`test-results/golden/<name>.actual.ppm` for review.

#### Scenario: Within tolerance
- **WHEN** every channel differs from the golden image by 0 or 1
- **THEN** the comparison passes

#### Scenario: Outside tolerance
- **WHEN** any channel differs by 2 or more
- **THEN** the comparison fails and reports the differing pixel count and maximum difference
- **AND** the actual image is written to `test-results/golden/<name>.actual.ppm`

#### Scenario: Size mismatch
- **WHEN** the rendered image and the golden image have different dimensions
- **THEN** the comparison fails and reports both sizes

#### Scenario: Buffer does not hold the stated image
- **WHEN** the rendered RGBA buffer's length is not width × height × 4 (for example, it is empty, or a render stopped partway)
- **THEN** the comparison fails, reporting the actual and expected byte counts, in both compare and update mode
- **AND** no golden or actual image is written

### Requirement: Deliberate golden regeneration
A missing golden image SHALL fail its comparison with a message naming the
file and `npm run golden:update`. It SHALL NOT be created automatically. Golden
files SHALL be written or overwritten only when `npm run golden:update` is
run, which runs the same suite in update mode.

#### Scenario: Missing golden fails
- **WHEN** a golden test runs under `npm test` and its golden file does not exist
- **THEN** the test fails, and no golden file is created

#### Scenario: Update mode writes goldens
- **WHEN** `npm run golden:update` is run
- **THEN** each golden test writes its current image to `test/golden/<name>.ppm` and passes

### Requirement: Milestone capture
`npm run capture -- <milestone>` SHALL save PNG screenshots of the running app
into `docs/progress/<milestone>/`, creating the directory if needed. It SHALL
use Chromium with a `1280 × 800` viewport and a device scale factor of `1`, so
repeated captures of the same state are the same size. Without a milestone
argument, it SHALL exit non-zero with a usage message and write nothing.

#### Scenario: Capture for a milestone
- **WHEN** `npm run capture -- M0` is run
- **THEN** `docs/progress/M0/` contains a `1280 × 800` PNG screenshot of the app page

#### Scenario: Missing milestone argument
- **WHEN** `npm run capture` is run with no argument
- **THEN** it exits non-zero with a usage message and writes no files

#### Scenario: Invalid milestone name
- **WHEN** the milestone argument does not start with a letter or digit, or contains characters other than letters, digits, `-`, and `_` (for example `--help` or `../escape`)
- **THEN** it exits non-zero with a usage message and writes no files

### Requirement: Pre-commit hook
The repository SHALL contain a versioned pre-commit hook that runs `npm test`
and blocks the commit when it fails. `npm run hooks:install` SHALL enable the
hook for the local clone. Running it more than once SHALL have the same effect
as running it once.

#### Scenario: Failing unit suite blocks a commit
- **WHEN** the hook is installed, `npm test` fails, and `git commit` is run
- **THEN** the commit is not created, and the test failure is shown

#### Scenario: Passing unit suite allows a commit
- **WHEN** the hook is installed and `npm test` passes
- **THEN** `git commit` proceeds

#### Scenario: Idempotent install
- **WHEN** `npm run hooks:install` is run twice
- **THEN** the hook is enabled exactly as after one run, and no error occurs
