// Browser shell for M1: re-renders the source synchronously on every edit.
// M2 replaces this trigger with the debounced, progressive, stale-marked editor.

import { renderSource } from '../core/render.js';
import { DEFAULT_SOURCE } from './default-source.js';

const WIDTH = 640;
const HEIGHT = 480;

const sourceInput = document.getElementById('source');
const canvas = document.getElementById('preview');
const diagnosticsList = document.getElementById('diagnostics');
const context = canvas.getContext('2d');

function update() {
  const started = performance.now();
  const { diagnostics, rgba } = renderSource(sourceInput.value, WIDTH, HEIGHT);
  diagnosticsList.replaceChildren(...diagnostics.map((diagnostic) => {
    const item = document.createElement('li');
    item.textContent = `${diagnostic.line}:${diagnostic.column} ${diagnostic.message}`;
    return item;
  }));
  // On error the canvas keeps the last valid image.
  if (rgba !== null) context.putImageData(new ImageData(rgba, WIDTH, HEIGHT), 0, 0);
  document.body.dataset.renderMs = String(Math.round(performance.now() - started));
}

sourceInput.value = DEFAULT_SOURCE;
sourceInput.addEventListener('input', update);
update();
document.body.dataset.moduleLoaded = 'true';
