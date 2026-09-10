// Runs an action once, delayMs after the last trigger. Timers are injectable
// so tests can use fake time.
export function createDebouncer(delayMs, timers = globalThis) {
  let handle = null;
  return {
    trigger(action) {
      if (handle !== null) timers.clearTimeout(handle);
      handle = timers.setTimeout(() => {
        handle = null;
        action();
      }, delayMs);
    },
    cancel() {
      if (handle !== null) timers.clearTimeout(handle);
      handle = null;
    },
    get pending() {
      return handle !== null;
    },
  };
}
