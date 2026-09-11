// Keeping the editor text in the browser, and the rules for replacing it
// (DESIGN §8 Save, load, and examples; D6, D26). Storage is reached only
// through getStorage, so Node tests can pass a fake or a failing one.

const SOURCE_KEY = 'web-csg.source';
const BASELINE_KEY = 'web-csg.baseline';

// Replacing the editor text needs the user's confirmation when it differs
// from the baseline: the text of the last Open, Save, or example load. A
// missing baseline (null) always differs.
export const needsConfirm = (text, baseline) => text !== baseline;

// The name Save downloads under: the last opened file's or example's name.
export const saveFileName = (lastName) => lastName ?? 'model.csg';

// getStorage returns a Storage-like object ({ getItem, setItem }), or throws
// when storage is unavailable. Every access is guarded: on any failure, load()
// returns null and the writes do nothing, so the app runs without autosave.
export function createStore(getStorage) {
  const write = (key, value) => {
    try {
      getStorage().setItem(key, value);
    } catch {
      // No storage, or no room: autosave is off.
    }
  };
  return {
    // The saved { source, baseline }, or null when no source is saved.
    // baseline is null when only a source was saved.
    load() {
      try {
        const storage = getStorage();
        const source = storage.getItem(SOURCE_KEY);
        return source === null ? null : { source, baseline: storage.getItem(BASELINE_KEY) };
      } catch {
        return null;
      }
    },
    saveSource: (text) => write(SOURCE_KEY, text),
    saveBaseline: (text) => write(BASELINE_KEY, text),
  };
}
