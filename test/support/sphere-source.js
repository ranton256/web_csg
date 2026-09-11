// The M1 startup example: a sphere lit by the default key light. Since M6 the
// app starts with the bored cube; tests that need this small, quick scene use
// it from here, so their goldens and expectations are unchanged.
export const SPHERE_SOURCE = `// A sphere lit by the default key light.
let r = 40;

camera {
  position: [120, -160, 100];
  lookAt: [0, 0, 0];
}

sphere(radius: r);
`;
