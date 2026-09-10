// The divider between editor and preview (DESIGN §4; sizes in DESIGN §5).

import { SETTINGS } from './settings.js';

// The editor width to use, given the width available to editor and preview
// together. Both keep their minimum; if there is not room for both, the
// editor keeps its minimum.
export function clampEditorWidth(width, available, limits = SETTINGS.divider) {
  const maximum = available - limits.minPreview;
  if (maximum < limits.minEditor) return limits.minEditor;
  return Math.min(Math.max(width, limits.minEditor), maximum);
}

// Wires pointer dragging and arrow keys. setWidth receives the requested
// width; the caller clamps it.
export function attachDivider(divider, { getWidth, setWidth, keyStep = SETTINGS.divider.keyStep }) {
  let dragStartX = null;
  let dragStartWidth = 0;

  divider.addEventListener('pointerdown', (event) => {
    dragStartX = event.clientX;
    dragStartWidth = getWidth();
    divider.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  divider.addEventListener('pointermove', (event) => {
    if (dragStartX !== null) setWidth(dragStartWidth + (event.clientX - dragStartX));
  });
  const endDrag = (event) => {
    if (dragStartX === null) return;
    dragStartX = null;
    divider.releasePointerCapture(event.pointerId);
  };
  divider.addEventListener('pointerup', endDrag);
  divider.addEventListener('pointercancel', endDrag);

  divider.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') setWidth(getWidth() - keyStep);
    else if (event.key === 'ArrowRight') setWidth(getWidth() + keyStep);
    else return;
    event.preventDefault();
  });
}
