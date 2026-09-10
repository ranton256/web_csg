import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDebouncer } from '../../src/ui/debounce.js';

// Minimal fake timers: advance(ms) runs due timers in time order.
function fakeTimers() {
  let now = 0;
  let nextId = 1;
  const pending = new Map();
  return {
    setTimeout(fn, ms) {
      pending.set(nextId, { fn, at: now + ms });
      return nextId++;
    },
    clearTimeout(id) {
      pending.delete(id);
    },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const due = [...pending.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (due === undefined) break;
        pending.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = end;
    },
  };
}

test('runs 300 ms after the last trigger, and not before', () => {
  const timers = fakeTimers();
  const debouncer = createDebouncer(300, timers);
  let runs = 0;
  debouncer.trigger(() => runs++);
  timers.advance(299);
  assert.equal(runs, 0);
  assert.equal(debouncer.pending, true);
  timers.advance(1);
  assert.equal(runs, 1);
  assert.equal(debouncer.pending, false);
});

test('each trigger restarts the wait', () => {
  const timers = fakeTimers();
  const debouncer = createDebouncer(300, timers);
  let runs = 0;
  debouncer.trigger(() => runs++);
  timers.advance(200);
  debouncer.trigger(() => runs++);
  timers.advance(299);
  assert.equal(runs, 0, 'no rebuild at 300 ms after the first edit');
  timers.advance(1);
  assert.equal(runs, 1, 'one rebuild at 500 ms');
  timers.advance(1000);
  assert.equal(runs, 1);
});

test('cancel drops the pending action', () => {
  const timers = fakeTimers();
  const debouncer = createDebouncer(150, timers);
  let runs = 0;
  debouncer.trigger(() => runs++);
  debouncer.cancel();
  timers.advance(1000);
  assert.equal(runs, 0);
  assert.equal(debouncer.pending, false);
});
