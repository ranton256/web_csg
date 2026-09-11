## MODIFIED Requirements

### Requirement: Serve repository files over local HTTP
The dev server SHALL serve files from the repository root over HTTP, bound to
the loopback interface (`127.0.0.1`) only. It SHALL listen on the port given
by a `--port <n>` or `--port=<n>` argument, else the `PORT` environment
variable, else `8080`. A port value SHALL consist of decimal digits only,
from 0 to 65535. A `--port` flag without a value, or any other port value
(including blanks, signs, decimals, exponents, and hexadecimal), SHALL be an
error: the server exits non-zero and does not start. An empty `PORT` is
treated as unset. A request for `/` SHALL return `index.html`. Starting the
server through a symbolically linked path SHALL behave exactly as starting
it through its real path, with or without Node's `--preserve-symlinks-main`
flag.

#### Scenario: Root serves the app page
- **WHEN** the server is started with `npm start` and `/` is requested
- **THEN** the response is `200` with the contents of `index.html`

#### Scenario: Port selection
- **WHEN** the server is started with `--port 4173`
- **THEN** it accepts connections on `127.0.0.1:4173`

#### Scenario: Started through a symlinked path
- **WHEN** the server script is started through a path that contains a symbolic link (for example, a checkout under macOS `/tmp`)
- **THEN** it behaves exactly as when started through its real path: it listens on the given port, and exits non-zero on an invalid port

#### Scenario: Started through a symlinked path with preserved symlinks
- **WHEN** the server script is started as `node --preserve-symlinks-main <symlinked path>/tools/serve.mjs`, once with a valid `--port` and once with `--port abc`
- **THEN** it listens on the given port in the first case, and exits non-zero in the second, exactly as through its real path. It never exits 0 without starting.

#### Scenario: Missing or invalid port value
- **WHEN** the server is started with `--port` and no value, or with `--port abc`, `--port " "`, or `--port 1e3`
- **THEN** it reports the error and exits non-zero instead of falling back to another port

#### Scenario: Not reachable from other interfaces
- **WHEN** the server is running
- **THEN** it is listening only on `127.0.0.1`, not on `0.0.0.0` or an external address

### Requirement: Confined to the repository
The server SHALL NOT return the contents of any file outside the repository
root, including through `..` segments, percent-encoded traversal, or absolute
paths. Such requests SHALL receive `403` or `404`. The server SHALL NOT list
directory contents; a request for a directory other than `/` SHALL receive
`404`. A request whose decoded path has any other segment starting with `.`
(a dot-path, such as `/.git/config`) SHALL receive `404`, whether or not the
file exists, so repository metadata is never served.

#### Scenario: Dot-dot traversal is refused
- **WHEN** `/../package.json` or `/%2e%2e/%2e%2e/etc/passwd` is requested
- **THEN** the response status is `403` or `404` and the body contains no file contents from outside the root

#### Scenario: Directory listing is refused
- **WHEN** `/tools/` is requested
- **THEN** the response status is `404`

#### Scenario: Dot-paths are not served
- **WHEN** `/.git/config`, `/.gitignore`, or the percent-encoded `/%2egit/config` is requested
- **THEN** the response status is `404`, and the body contains none of the file's contents
