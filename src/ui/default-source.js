// The example shown when the page opens (M1). Kept free of browser APIs so
// Node tests can render exactly what the page shows.
export const DEFAULT_SOURCE = `// A sphere lit by the default key light.
let r = 40;

camera {
  position: [120, -160, 100];
  lookAt: [0, 0, 0];
}

sphere(radius: r);
`;
