// Progressive rendering (DESIGN §8 Live rebuild and progressive rendering):
// renders a compiled scene row by row into rgba. A slice starts no new row
// once budgetMs have elapsed, then yields, so it runs at most one row past the
// budget (DESIGN §5, D18). The clock, scheduler, and row renderer are
// injectable so tests can use fake time; the browser passes performance.now
// and a MessageChannel scheduler.

import { renderRows } from '../core/render.js';

// Starts a job; the first slice runs on the next schedule() turn.
// onBand(y0, y1) is called after each slice with the rows it finished;
// onDone() after the last. cancel() stops all further work and callbacks.
export function startRenderJob({
  scene, width, height, rgba, budgetMs, now, schedule, onBand, onDone, renderRow = renderRows,
}) {
  let cancelled = false;
  let y = 0;

  function slice() {
    if (cancelled) return;
    const started = now();
    const y0 = y;
    do {
      renderRow(scene, width, height, y, y + 1, rgba);
      y++;
    } while (y < height && now() - started < budgetMs);
    onBand(y0, y);
    if (y < height) schedule(slice);
    else onDone();
  }

  schedule(slice);
  return {
    cancel() {
      cancelled = true;
    },
  };
}
