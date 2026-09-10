// Editor numbers, mirroring DESIGN §5. Change DESIGN first, then here.
export const SETTINGS = Object.freeze({
  rebuildDebounceMs: 300,
  resizeDebounceMs: 150,
  renderSliceMs: 12, // rendering yields to the browser after this much work (D18)
  divider: Object.freeze({ initialEditor: 420, minEditor: 240, minPreview: 240, keyStep: 16 }), // px (D18)
});
