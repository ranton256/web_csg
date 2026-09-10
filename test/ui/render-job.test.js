import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compile, renderSource } from '../../src/core/render.js';
import { DEFAULT_SOURCE } from '../../src/ui/default-source.js';
import { startRenderJob } from '../../src/ui/render-job.js';

const WIDTH = 32;
const HEIGHT = 24;

// A job with a manual scheduler. The fake clock advances 1 ms per now() call.
function makeJob(overrides = {}) {
  const queue = [];
  let clock = 0;
  const bands = [];
  let done = 0;
  const rgba = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  const job = startRenderJob({
    scene: compile(DEFAULT_SOURCE).scene,
    width: WIDTH,
    height: HEIGHT,
    rgba,
    budgetMs: 12,
    now: () => clock++,
    schedule: (task) => queue.push(task),
    onBand: (y0, y1) => bands.push([y0, y1]),
    onDone: () => done++,
    ...overrides,
  });
  const runNext = () => queue.shift()?.();
  const runAll = () => {
    while (queue.length > 0) runNext();
  };
  return { job, queue, bands, rgba, runNext, runAll, doneCount: () => done };
}

test('nothing renders until the first scheduled slice runs', () => {
  const { bands, queue } = makeJob();
  assert.deepEqual(bands, []);
  assert.equal(queue.length, 1);
});

test('slices stop at the time budget and cover every row once, in order', () => {
  const { bands, runAll, doneCount } = makeJob();
  runAll();
  assert.ok(bands.length > 1, 'rendering is split into several slices');
  let expected = 0;
  for (const [y0, y1] of bands) {
    assert.equal(y0, expected);
    assert.ok(y1 > y0 && y1 - y0 <= 12, `band [${y0}, ${y1}) respects the 12 ms budget`);
    expected = y1;
  }
  assert.equal(expected, HEIGHT);
  assert.equal(doneCount(), 1);
});

test('the finished buffer equals a single full render', () => {
  const { rgba, runAll } = makeJob();
  runAll();
  assert.deepEqual(rgba, renderSource(DEFAULT_SOURCE, WIDTH, HEIGHT).rgba);
});

test('with a frozen clock, one slice renders everything', () => {
  const { bands, runAll } = makeJob({ now: () => 0 });
  runAll();
  assert.deepEqual(bands, [[0, HEIGHT]]);
});

test('cancel stops further work and callbacks', () => {
  const { job, bands, runNext, runAll, doneCount } = makeJob();
  runNext();
  const drawn = bands.length;
  job.cancel();
  runAll();
  assert.equal(bands.length, drawn);
  assert.equal(doneCount(), 0);
});

test('cancel before the first slice draws nothing', () => {
  const { job, bands, runAll, doneCount } = makeJob();
  job.cancel();
  runAll();
  assert.deepEqual(bands, []);
  assert.equal(doneCount(), 0);
});
