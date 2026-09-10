import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compile, renderRows, renderSource } from '../../src/core/render.js';
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

test('slices cover every row once, in order (fake clock: 1 ms per read)', () => {
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

// Runs a whole job where rendering row y costs rowCost(y) fake milliseconds.
// Returns each slice's rows with the elapsed time at which each row started.
function runWithRowCosts(rowCost) {
  let clock = 0;
  let sliceStart = 0;
  const slices = [[]];
  const queue = [];
  startRenderJob({
    scene: compile(DEFAULT_SOURCE).scene,
    width: WIDTH,
    height: HEIGHT,
    rgba: new Uint8ClampedArray(WIDTH * HEIGHT * 4),
    budgetMs: 12,
    now: () => clock,
    schedule: (task) => queue.push(task),
    onBand: () => {
      sliceStart = clock;
      slices.push([]);
    },
    onDone: () => {},
    renderRow: (scene, width, height, y0, y1, rgba) => {
      slices[slices.length - 1].push({ y: y0, startedAt: clock - sliceStart });
      clock += rowCost(y0);
      renderRows(scene, width, height, y0, y1, rgba);
    },
  });
  while (queue.length > 0) queue.shift()();
  return slices.filter((rows) => rows.length > 0);
}

test('a slice starts no new row once 12 ms have elapsed (at most one row past)', () => {
  for (const [cost, rowsPerSlice] of [[1, 12], [5, 3], [11.9, 2], [12, 1], [25, 1]]) {
    const slices = runWithRowCosts(() => cost);
    assert.equal(slices.flat().length, HEIGHT);
    for (const rows of slices.slice(0, -1)) assert.equal(rows.length, rowsPerSlice, `row cost ${cost} ms`);
  }
});

test('with varying row costs, every row starts before 12 ms and each slice ends once 12 ms have passed', () => {
  const rowCost = (y) => [1, 7, 3, 12, 0.5, 20][y % 6];
  const slices = runWithRowCosts(rowCost);
  assert.deepEqual(slices.flat().map((row) => row.y), Array.from({ length: HEIGHT }, (_, y) => y));
  for (const [i, rows] of slices.entries()) {
    assert.equal(rows[0].startedAt, 0);
    for (const row of rows) assert.ok(row.startedAt < 12, `slice ${i} started row ${row.y} at ${row.startedAt} ms`);
    const last = rows[rows.length - 1];
    const isFinalSlice = i === slices.length - 1;
    if (!isFinalSlice) assert.ok(last.startedAt + rowCost(last.y) >= 12, `slice ${i} yielded early`);
  }
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
