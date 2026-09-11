// Browser shell (DESIGN §8 Live rebuild and progressive rendering; Invalid
// edits keep the last valid preview). Browser APIs live only in src/ui/.

import { compile } from '../core/render.js';
import { createDebouncer } from './debounce.js';
import { attachDivider, clampEditorWidth } from './divider.js';
import { EXAMPLES, FIRST_LAUNCH_SOURCE } from './examples.js';
import { HELP_SECTIONS } from './help-content.js';
import { indentEdit } from './indent.js';
import { createStore, needsConfirm, saveFileName } from './persistence.js';
import { startRenderJob } from './render-job.js';
import { SETTINGS } from './settings.js';
import { lineColumnToOffset, lineCount } from './text-position.js';

const byId = (id) => document.getElementById(id);
const workspace = byId('workspace');
const source = byId('source');
const gutter = byId('gutter');
const diagnosticsList = byId('diagnostics');
const divider = byId('divider');
const panel = byId('preview-panel');
const canvas = byId('preview');
const staleIndicator = byId('stale');
const statusIndicator = byId('status');
const context = canvas.getContext('2d');

// Counters exposed as data-* attributes for scripted tests.
const counters = { rebuilds: 0, rendersStarted: 0, rendersDone: 0, rendersCancelled: 0, resizeEvents: 0 };
function count(name) {
  counters[name]++;
  document.body.dataset[name] = String(counters[name]);
}

// --- Saved source (D6, D26) --------------------------------------------------

const store = createStore(() => window.localStorage);
let baseline = null; // the text of the last Open, Save, or example load
let lastName = null; // the file or example name that Save downloads under

// --- Gutter ---------------------------------------------------------------

let gutterLines = 0;
function updateGutter() {
  const lines = lineCount(source.value);
  if (lines !== gutterLines) {
    gutterLines = lines;
    gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  }
  gutter.scrollTop = source.scrollTop;
}

// --- Diagnostics ----------------------------------------------------------

function showDiagnostics(diagnostics) {
  diagnosticsList.replaceChildren(...diagnostics.map((diagnostic) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${diagnostic.line}:${diagnostic.column} ${diagnostic.message}`;
    button.addEventListener('click', () => {
      const offset = lineColumnToOffset(source.value, diagnostic.line, diagnostic.column);
      source.focus();
      source.setSelectionRange(offset, offset);
    });
    item.append(button);
    return item;
  }));
}

// --- Progressive rendering --------------------------------------------------

// A MessageChannel yields to input and paint without setTimeout's clamping.
const channel = new MessageChannel();
const queue = [];
channel.port1.onmessage = () => queue.shift()?.();
const schedule = (task) => {
  queue.push(task);
  channel.port2.postMessage(null);
};

let lastScene = null;
let job = null;
let jobRunning = false;

function restartRender() {
  if (job !== null && jobRunning) {
    job.cancel();
    count('rendersCancelled');
  }
  if (lastScene === null) return;
  const { width, height } = canvas;
  const image = new ImageData(width, height);
  count('rendersStarted');
  statusIndicator.hidden = false;
  jobRunning = true;
  const current = startRenderJob({
    scene: lastScene,
    width,
    height,
    rgba: image.data,
    budgetMs: SETTINGS.renderSliceMs,
    now: () => performance.now(),
    schedule,
    onBand: (y0, y1) => context.putImageData(image, 0, 0, 0, y0, width, y1 - y0),
    onDone: () => {
      jobRunning = false;
      statusIndicator.hidden = true;
      count('rendersDone');
    },
  });
  job = current;
}

// --- Rebuild ----------------------------------------------------------------

function rebuild() {
  count('rebuilds');
  const { diagnostics, scene } = compile(source.value);
  showDiagnostics(diagnostics);
  if (scene === null) {
    // Keep showing (and finishing) the last valid model, marked stale. With no
    // valid model yet (an invalid saved source on reload), nothing is shown,
    // so the indicator stays hidden (D27).
    staleIndicator.hidden = lastScene === null;
    return;
  }
  staleIndicator.hidden = true;
  lastScene = scene;
  restartRender();
}

const rebuildDebouncer = createDebouncer(SETTINGS.rebuildDebounceMs);
source.addEventListener('input', () => {
  store.saveSource(source.value);
  updateGutter();
  rebuildDebouncer.trigger(rebuild);
});
source.addEventListener('scroll', () => {
  gutter.scrollTop = source.scrollTop;
});

// --- Tab indentation (D23) ---------------------------------------------------

// Tab and Shift+Tab indent in the editor. Esc first lets the next Tab move
// focus as usual, so keyboard users are never trapped (WCAG 2.1.2).
let escapeArmed = false;
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

// Applies an indentation edit through the browser's own editing commands, so
// undo treats it like typing (D23). Both commands fire the input event, so the
// gutter and the rebuild follow as for typing. An edit that removes the whole
// range (Shift+Tab on a line of only spaces) is a delete, not an empty insert.
function applyIndent(edit) {
  if (source.value.slice(edit.from, edit.to) !== edit.insert) {
    source.setSelectionRange(edit.from, edit.to);
    const applied = edit.insert === ''
      ? document.execCommand('delete', false)
      : document.execCommand('insertText', false, edit.insert);
    if (!applied) {
      source.setRangeText(edit.insert, edit.from, edit.to);
      source.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  source.setSelectionRange(edit.selectionStart, edit.selectionEnd);
}

source.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    escapeArmed = true;
    return;
  }
  if (event.key !== 'Tab') {
    if (!MODIFIER_KEYS.has(event.key)) escapeArmed = false;
    return;
  }
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  if (escapeArmed) {
    escapeArmed = false;
    return; // the browser moves focus
  }
  event.preventDefault();
  applyIndent(indentEdit(source.value, source.selectionStart, source.selectionEnd, { outdent: event.shiftKey }));
});
source.addEventListener('blur', () => {
  escapeArmed = false;
});

// --- Help (D23) ---------------------------------------------------------------

const helpDialog = byId('help');

// Text with `backticks` becomes text nodes and <code> elements (no markup parsing).
function appendWithCode(element, text) {
  text.split('`').forEach((part, i) => {
    if (i % 2 === 0) {
      element.append(part);
    } else {
      const code = document.createElement('code');
      code.textContent = part;
      element.append(code);
    }
  });
}

for (const section of HELP_SECTIONS) {
  const heading = document.createElement('h3');
  heading.textContent = section.title;
  byId('help-body').append(heading);
  for (const block of section.body) {
    if (typeof block === 'string') {
      const paragraph = document.createElement('p');
      appendWithCode(paragraph, block);
      byId('help-body').append(paragraph);
    } else {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = block.code;
      pre.append(code);
      byId('help-body').append(pre);
    }
  }
}

// A modal <dialog> contains focus, closes on Esc, and returns focus to the
// element that had it when it opened; e2e/help.spec.js checks this on all
// three engines.
byId('help-button').addEventListener('click', () => helpDialog.showModal());
byId('help-close').addEventListener('click', () => helpDialog.close());

// --- Open, Save, and examples (D6, D26) --------------------------------------

const CONFIRM_REPLACE = 'Replace the editor text? Changes since the last Open, Save, or example will be lost.';

// Asks before replacing text that differs from the last loaded text.
const mayReplace = () => !needsConfirm(source.value, baseline) || window.confirm(CONFIRM_REPLACE);

// Shows text as a new document, rebuilt at once, and makes it the last loaded
// text. Setting the value starts a new undo history.
function load(text, name) {
  source.value = text;
  source.setSelectionRange(0, 0);
  source.scrollTop = 0;
  rebuildDebouncer.cancel();
  updateGutter();
  rebuild();
  baseline = text;
  lastName = name;
  store.saveSource(text);
  store.saveBaseline(text);
}

// Open asks only once a file is chosen, so cancelling the chooser changes
// nothing. The file is read as UTF-8, which drops a leading byte-order mark.
const openFile = byId('open-file');
byId('open-button').addEventListener('click', () => openFile.click());
openFile.addEventListener('change', async () => {
  const [file] = openFile.files;
  openFile.value = ''; // so the same file can be chosen again
  if (file === undefined) return;
  const text = await file.text();
  if (mayReplace()) load(text, file.name);
});

// Save downloads exactly the editor text, which then counts as loaded.
byId('save-button').addEventListener('click', () => {
  const text = source.value;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = saveFileName(lastName);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url));
  baseline = text;
  store.saveBaseline(text);
});

// The picker shows its "Examples…" prompt again after every choice.
const examplesPicker = byId('examples');
for (const example of EXAMPLES) examplesPicker.append(new Option(example.title, example.id));
examplesPicker.addEventListener('change', () => {
  const example = EXAMPLES.find((candidate) => candidate.id === examplesPicker.value);
  examplesPicker.selectedIndex = 0;
  if (example !== undefined && mayReplace()) load(example.source, example.fileName);
});

// --- Resizing ---------------------------------------------------------------

// Sizes the canvas to the panel (one ray per CSS pixel). The old image is
// scaled into the new size so the picture never goes blank. Returns whether
// the size changed.
function fitCanvas() {
  const width = Math.max(1, Math.floor(panel.clientWidth));
  const height = Math.max(1, Math.floor(panel.clientHeight));
  if (width === canvas.width && height === canvas.height) return false;
  const snapshot = document.createElement('canvas');
  snapshot.width = canvas.width;
  snapshot.height = canvas.height;
  snapshot.getContext('2d').drawImage(canvas, 0, 0);
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.drawImage(snapshot, 0, 0, width, height);
  return true;
}

const resizeDebouncer = createDebouncer(SETTINGS.resizeDebounceMs);
new ResizeObserver(() => {
  count('resizeEvents');
  resizeDebouncer.trigger(() => {
    if (fitCanvas()) restartRender();
  });
}).observe(panel);

// --- Divider ----------------------------------------------------------------

let editorWidth = SETTINGS.divider.initialEditor;
function setEditorWidth(requested) {
  const available = workspace.clientWidth - divider.offsetWidth;
  editorWidth = clampEditorWidth(requested, available);
  workspace.style.setProperty('--editor-width', `${editorWidth}px`);
  divider.setAttribute('aria-valuenow', String(editorWidth));
}
attachDivider(divider, { getWidth: () => editorWidth, setWidth: setEditorWidth });
window.addEventListener('resize', () => setEditorWidth(editorWidth));

// --- Start ------------------------------------------------------------------

setEditorWidth(editorWidth);
// The saved source and its baseline, or on first launch the bored cube (D10).
const saved = store.load();
if (saved === null) {
  source.value = FIRST_LAUNCH_SOURCE;
  baseline = FIRST_LAUNCH_SOURCE;
  store.saveBaseline(baseline);
} else {
  source.value = saved.source;
  baseline = saved.baseline;
}
updateGutter();
fitCanvas();
rebuild();
document.body.dataset.moduleLoaded = 'true';
