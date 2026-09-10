// Browser shell (DESIGN §8 Live rebuild and progressive rendering; Invalid
// edits keep the last valid preview). Browser APIs live only in src/ui/.

import { compile } from '../core/render.js';
import { createDebouncer } from './debounce.js';
import { DEFAULT_SOURCE } from './default-source.js';
import { attachDivider, clampEditorWidth } from './divider.js';
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
    // Keep showing (and finishing) the last valid model, marked stale.
    staleIndicator.hidden = false;
    return;
  }
  staleIndicator.hidden = true;
  lastScene = scene;
  restartRender();
}

const rebuildDebouncer = createDebouncer(SETTINGS.rebuildDebounceMs);
source.addEventListener('input', () => {
  updateGutter();
  rebuildDebouncer.trigger(rebuild);
});
source.addEventListener('scroll', () => {
  gutter.scrollTop = source.scrollTop;
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
source.value = DEFAULT_SOURCE;
updateGutter();
fitCanvas();
rebuild();
document.body.dataset.moduleLoaded = 'true';
