## MODIFIED Requirements

### Requirement: Invalid edits keep the last valid preview
Source: DESIGN §8 Invalid edits keep the last valid preview; §3 ("Never lose
the picture"); §12 D27.

When a rebuild finds any diagnostic:
- The preview SHALL keep showing the last valid model. If that model's render
  is still in progress, it continues.
- A visible stale indicator SHALL say that the preview shows the last valid
  model. When no valid model exists yet, as when an invalid saved source is
  restored on reload, the preview shows no model, and the indicator SHALL
  stay hidden (D27).
- The diagnostics list SHALL show each diagnostic as `line:column message`.

When a later rebuild is valid, the stale indicator SHALL be hidden and the new
model rendered. A resize while stale SHALL re-render the last valid model at
the new size and stay stale.

#### Scenario: Error keeps the last valid model, marked stale
- **WHEN** a valid model is displayed and the source is edited to contain an error
- **THEN** after the rebuild, the preview still shows the last valid model, the stale indicator is visible, and the error is listed with its line and column

#### Scenario: Fixing the error clears the stale indicator
- **WHEN** the preview is marked stale and the source is edited to be valid again
- **THEN** after the rebuild, the preview shows the new model, and the stale indicator is hidden

#### Scenario: Resizing while stale keeps the last valid model
- **WHEN** the preview is stale and the preview panel is resized
- **THEN** the last valid model is re-rendered at the new size, and the stale indicator stays visible

#### Scenario: No valid model yet
- **WHEN** the page opens with an invalid saved source
- **THEN** the diagnostics list shows the error, the stale indicator is hidden, and the preview shows no model
- **AND** once the source is edited to be valid, the new model is rendered
