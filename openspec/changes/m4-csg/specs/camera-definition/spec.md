## ADDED Requirements

### Requirement: Camera math stays finite
Source: DESIGN §12 D16 (best effort outside the supported scene scale), §8 Camera definition.

Camera values outside the supported scene scale SHALL be accepted, with no
range check. When the distance from `position` to `lookAt` is too large to
compute as a finite number, the evaluator SHALL report a diagnostic at
`lookAt` saying that position and lookAt are too far apart. It SHALL NOT
report up as zero or parallel because of that overflow. Likewise, when the
length of `up` is too large to compute as a finite number, the evaluator
SHALL report a diagnostic at `up` saying up is too large, and SHALL NOT
report it as parallel.

#### Scenario: A camera too far away is reported clearly
- **WHEN** the camera has `position: [p, 0, 0]` and `lookAt: [0, 0, 0]`, where `p` is `1` followed by 200 zeros
- **THEN** the only camera diagnostic is at `lookAt` and says that position and lookAt are too far apart

#### Scenario: A large but finite camera is accepted
- **WHEN** the camera has `position: [16000000, 0, 0]` and `lookAt: [0, 0, 0]`
- **THEN** there is no camera diagnostic

#### Scenario: An up vector too large is reported clearly
- **WHEN** the camera has `position: [0, -100, 0]`, `lookAt: [0, 0, 0]`, and `up: [0, p, p]`, where `p` is `1` followed by 200 zeros
- **THEN** the only camera diagnostic is at `up` and says up is too large
