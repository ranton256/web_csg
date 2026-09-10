# dev-server Specification

## Purpose

Serves the Web CSG app from the repository over local HTTP so that browsers,
the end-to-end test runner, and the milestone capture tool can load it as
native ES modules, without exposing anything outside the repository.

## Requirements

Source: CONSTRAINTS §1 (dev server) and §4 (`npm start`); established by change `m0-foundations` (M0).

### Requirement: Serve repository files over local HTTP
The dev server SHALL serve files from the repository root over HTTP, bound to
the loopback interface (`127.0.0.1`) only. It SHALL listen on the port given
by a `--port <n>` or `--port=<n>` argument, else the `PORT` environment
variable, else `8080`. A port value SHALL consist of decimal digits only,
from 0 to 65535. A `--port` flag without a value, or any other port value
(including blanks, signs, decimals, exponents, and hexadecimal), SHALL be an
error: the server exits non-zero and does not start. An empty `PORT` is
treated as unset. A request for `/` SHALL return `index.html`.

#### Scenario: Root serves the app page
- **WHEN** the server is started with `npm start` and `/` is requested
- **THEN** the response is `200` with the contents of `index.html`

#### Scenario: Port selection
- **WHEN** the server is started with `--port 4173`
- **THEN** it accepts connections on `127.0.0.1:4173`

#### Scenario: Started through a symlinked path
- **WHEN** the server script is started through a path that contains a symbolic link (for example, a checkout under macOS `/tmp`)
- **THEN** it behaves exactly as when started through its real path: it listens on the given port, and exits non-zero on an invalid port

#### Scenario: Missing or invalid port value
- **WHEN** the server is started with `--port` and no value, or with `--port abc`, `--port " "`, or `--port 1e3`
- **THEN** it reports the error and exits non-zero instead of falling back to another port

#### Scenario: Not reachable from other interfaces
- **WHEN** the server is running
- **THEN** it is listening only on `127.0.0.1`, not on `0.0.0.0` or an external address

### Requirement: Correct content types for module loading
The server SHALL send a `Content-Type` matching the file extension. At least
these SHALL be supported:
- `.html`: `text/html; charset=utf-8`
- `.js` and `.mjs`: `text/javascript; charset=utf-8`
- `.css`: `text/css; charset=utf-8`
- `.json`: `application/json; charset=utf-8`
- `.png`: `image/png`
- `.csg`, `.txt`, and `.md`: `text/plain; charset=utf-8`

Other extensions SHALL be `application/octet-stream`.

#### Scenario: JavaScript modules load in the browser
- **WHEN** a `.js` file is requested
- **THEN** the response has `Content-Type: text/javascript; charset=utf-8`

#### Scenario: Unknown extension
- **WHEN** a file with an unlisted extension is requested
- **THEN** the response has `Content-Type: application/octet-stream`

### Requirement: Edits are visible on reload
Every successful response SHALL carry `Cache-Control: no-store`, so reloading
the page always loads the current files.

#### Scenario: No caching
- **WHEN** any file is served
- **THEN** the response includes `Cache-Control: no-store`

### Requirement: Confined to the repository
The server SHALL NOT return the contents of any file outside the repository
root, including through `..` segments, percent-encoded traversal, or absolute
paths. Such requests SHALL receive `403` or `404`. The server SHALL NOT list
directory contents; a request for a directory other than `/` SHALL receive
`404`.

#### Scenario: Dot-dot traversal is refused
- **WHEN** `/../package.json` or `/%2e%2e/%2e%2e/etc/passwd` is requested
- **THEN** the response status is `403` or `404` and the body contains no file contents from outside the root

#### Scenario: Directory listing is refused
- **WHEN** `/tools/` is requested
- **THEN** the response status is `404`

### Requirement: Clear errors for missing files and unsupported methods
A request for a non-existent file SHALL receive `404`. `GET` and `HEAD` SHALL
be supported, and any other method SHALL receive `405`. `HEAD` SHALL return
the same status and headers as `GET` with no body.

#### Scenario: Missing file
- **WHEN** `/does-not-exist.js` is requested
- **THEN** the response status is `404`

#### Scenario: Unsupported method
- **WHEN** a `POST` request is made to `/`
- **THEN** the response status is `405`
