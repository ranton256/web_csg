## 1. Setup

- [x] 1.1 Create and switch to branch `m6-persistence-and-examples` from `main` (done when the change was proposed, at `a2e4731`)

## 2. D17 in the lexer

- [x] 2.1 `src/core/lexer.js`: skip one U+FEFF at index 0, without advancing the column (design D-4). A later or second U+FEFF stays an "unexpected character"
- [x] 2.2 `src/core/lexer.js`: the unexpected-character message names the character (design D-4): `'X'` for visible ASCII, `'X' (U+XXXX)` for visible non-ASCII, and `U+XXXX` plus a name from the fixed list for invisible characters (categories Zs, Zl, Zp, Cc, Cf)
- [x] 2.3 `test/core/lexer.test.js`, for every "Lexical structure" scenario:
  - the BOM: a leading BOM gives the same tokens and positions as without it; a diagnostic after it keeps its line and column; a second leading BOM, and one after the start, give "unexpected character U+FEFF (byte-order mark)" at their positions;
  - the messages: `let é = 1;` gives "'é' (U+00E9)" at `é`; a non-breaking space gives "U+00A0 (no-break space)"; U+0007 gives "U+0007"; `😀` gives "'😀' (U+1F600)", which updates the existing emoji expectation; `$` is unchanged;
  - every name in the list, checked against its code point

## 3. Examples and fixtures

- [x] 3.1 `src/ui/examples.js` (new, design D-1): `EXAMPLES` (`bored-cube`, `primitives`, `boolean-operations`, with their titles and file names) and `FIRST_LAUNCH_SOURCE`. The bored cube moves here verbatim, and `test/support/vision-example.js` re-exports it as `VISION_EXAMPLE`
- [x] 3.2 Write the Primitives and Boolean operations sources: the `arrangement` and `booleans` scenes' solids, with comments, and with lights and a material (design D-1). The Boolean example uses a point light
- [x] 3.3 `test/support/sphere-source.js` (new): `SPHERE_SOURCE`, the old M1 sphere text. Remove `src/ui/default-source.js`, and switch its users:
  - `render.test.js`, `render-golden.test.js` (the `sphere` golden unchanged), and `render-job.test.js`;
  - `e2e/live-rebuild.spec.js`, and the capture tool's `stale` shot, to `SPHERE_SOURCE`;
  - the `editor-preview` e2e initial-value and Tab-undo checks, to `FIRST_LAUNCH_SOURCE`
- [x] 3.4 `test/ui/examples.test.js` (new): the ids, titles, and file names, in order; every example compiles with no diagnostics; the bored cube equals the `vision.md` example; Primitives has all four primitives, and Boolean operations all three Boolean operations; the goldens `example-bored-cube`, `example-primitives`, and `example-boolean-operations` (64×48), created with `npm run golden:update -- test/ui/examples.test.js`, with the images reviewed
- [x] 3.5 Every existing golden still matches byte for byte (`npm test` before any golden update)

## 4. Persistence logic

- [x] 4.1 `src/ui/persistence.js` (new, design D-2): `needsConfirm`, `saveFileName`, and `createStore(getStorage)`, with the keys `web-csg.source` and `web-csg.baseline`, and every storage access guarded
- [x] 4.2 `test/ui/persistence.test.js` (new): `needsConfirm` (equal, different, missing baseline); `saveFileName` (`null` gives `model.csg`, and a name passes through); `createStore` with a fake storage (round trip, source without baseline), a throwing `getStorage`, and a `setItem` that throws

## 5. The page

- [x] 5.1 `index.html`: a header toolbar with "Open…", a hidden `<input type="file" accept=".csg,text/plain">`, "Save", the "Examples…" `<select>` (a disabled, selected placeholder, then the three examples in order), and "Help"
- [x] 5.2 `src/ui/main.js` (design D-3): the start (the saved source and baseline, or the first-launch source); autosave on `input`; `load(text, name)` (the caret and scroll at the start, the debounce cancelled, an immediate rebuild, then the baseline, name, and store updated); Open (confirm only after a file is chosen, then reset the input; a cancel does nothing); Save (the exact text as a download named by `saveFileName`, then the baseline updated); the examples (confirm, load, and reset the picker); the confirmation message
- [x] 5.3 `e2e/persistence.spec.js` (new, on all three engines), with a `dialog` listener that fails on unexpected prompts. It covers:
  - the reload restore, and an invalid source restored with its diagnostics;
  - the app with a throwing `localStorage`;
  - the first launch;
  - Save: the exact text, valid and invalid, and each file-name rule;
  - Open: the text, diagnostics, and render; a BOM-prefixed file; a cancel with no prompt;
  - the examples: the exact options, each loads with no diagnostics, and the picker resets and reloads;
  - the confirmation: decline, accept, no prompt when unedited, after a Save, or on first launch, and a prompt after a reload of edited text
- [x] 5.4 `e2e/editor-preview.spec.js`: "The header has the file and example controls", and "The example renders on load" with the bored cube
- [x] 5.5 Measure the full e2e run time on `main` and on this branch, and record both in the README (design risks)
- [x] 5.6 The stale indicator stays hidden while no valid model exists (D27, the owner's decision during apply; the `stale-preview` delta): `main.js`, and the invalid-restore e2e test checks it, then that a valid edit renders

## 6. Documentation

- [x] 6.1 DESIGN (design D-6):
  - §4: the header toolbar;
  - §8 Save, load, and examples: scenarios for the save file name, a file with a BOM, a cancelled Open, the picker reset, and the app without storage;
  - §8 Modeling language: the D17 rules (ASCII identifiers and whitespace, the leading BOM, and the unexpected-character messages with the name list);
  - §12: D26 (the writer's defaults). D17 was resolved during planning, in the owner's D17 interview
- [x] 6.2 CONSTRAINTS §2: the modules `examples.js` and `persistence.js`, and the removed `default-source.js`
- [x] 6.3 ROADMAP: set M6's status

## 7. Verification, review, and merge

- [x] 7.1 Seen to fail, in an isolated copy, with the test files listed explicitly and a passing baseline (the e2e mutants with `persistence.spec.js` on the three engines). Each mutant must fail the named tests:
  - M1: the lexer does not skip a leading BOM;
  - M2: the BOM skip advances the column;
  - M3: `needsConfirm` always returns `false`;
  - M4: the baseline is not saved, so a reload forgets it;
  - M5: Save does not update the baseline;
  - M6: the examples picker is not reset after a choice;
  - M7: autosave is removed from the `input` listener;
  - M8: `createStore` does not guard a throwing `getStorage`;
  - M9: Open confirms before the file chooser, so a cancel prompts;
  - M10: `saveFileName` ignores the last opened file's name;
  - M11: an invisible character is shown as its glyph, not its code point;
  - M12: the character-name lookup is removed;
  - M13: the code point is not padded to four digits;
  - M14: the stale indicator shows when no valid model exists;
  - M15: a load waits for the 300 ms debounce instead of rebuilding at once (D26 d)
- [x] 7.2 `npm run check < /dev/null` green, then a fresh clone at the branch head (`npm ci`, `npx playwright install`, `npm run hooks:install`, `npm run check < /dev/null`) green
- [x] 7.3 `npm run capture -- M6` (the `app` shot on first launch, and one shot per example), then write `docs/progress/M6/README.md`: the ROADMAP "done when" criteria, the gates, test coverage per scenario, the seen-to-fail records, the e2e timings, and the captures
- [x] 7.4 The owner's full manual pass of DESIGN §8 in Safari, recorded in the README as a checklist (a ROADMAP "done when" criterion)
- [x] 7.5 A separate Critic review (`project-critic`) of `main..m6-persistence-and-examples`. Fix findings and re-review until `[APPROVED]`
- [x] 7.6 Merge into `main`, mark M6 complete in ROADMAP (the first release), and archive with `/opsx:archive`: sync the specs (the new `save-load-and-examples`, and the `editor-preview`, `modeling-language`, `implicit-union`, and `stale-preview` deltas), and refresh any stale Purpose lines

## 8. Critic round 1 fixes

- [x] 8.1 F1 (blocking; the owner chose D28): Open normalizes line breaks to `\n` (`normalizeLineBreaks` in `persistence.js`), and `load()` makes the text the editor holds the baseline and the autosaved source, so a CRLF file gives no false prompt. The spec, DESIGN §8, and D28 record it. Tests: `persistence.test.js`, and an e2e test with `\r\n` and lone `\r` files (open, then an example with no prompt; open, then Save gives `\n`)
- [x] 8.2 F2 (blocking): `lineColumnToOffset` skips a leading byte-order mark, as the lexer does (D17), so clicking a diagnostic on line 1 lands on its column. Test: `test/ui/text-position.test.js`
- [x] 8.3 F3: e2e tests that an opened file and a chosen example are autosaved (a reload shows them), and that a Save is remembered across a reload; the Open test checks the file input is emptied (the Critic's mutant C)
- [x] 8.4 F4: the spec says the save file name lasts for the page session (D26 a), with a scenario; the file-name e2e test checks `model.csg` after a reload. DESIGN §4 asset inventory: the examples are done
- [x] 8.5 Seen to fail: the Critic's mutants A (no autosave on a load), B (Save does not save the baseline), and C (the file input is not emptied); a raw-text baseline in `load()` (F1); and no BOM skip in `lineColumnToOffset` (F2)
- [x] 8.6 The full gate and a fresh clone at the new head; the README Critic round 1 section; a new Critic review
