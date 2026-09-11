// Every tunable number, mirroring DESIGN §5. Change DESIGN first, then here.

// World units: hit-interval tolerance, and when two points count as equal.
export const EPSILON = 1e-6;

// Sine of the angle between camera up and the view direction below which they
// count as parallel (DESIGN §5, decision D14).
export const PARALLEL_TOLERANCE = 1e-6;

// Levels of nesting allowed: each unary minus, vector bracket, parenthesis,
// and transform or Boolean body is a level. Deeper input is a syntax error,
// which keeps parsing and evaluation within every engine's stack (D15, D18).
export const MAX_NESTING_DEPTH = 100;

export const CAMERA_DEFAULTS = Object.freeze({
  up: Object.freeze([0, 0, 1]),
  fov: 45, // degrees, vertical
});

// Blinn-Phong coefficients.
export const SHADING = Object.freeze({
  ambient: 0.15,
  diffuse: 0.75,
  specular: 0.3,
  shininess: 32,
});

export const DEFAULT_COLOR = Object.freeze([0.8, 0.8, 0.8]);
export const BACKGROUND = Object.freeze([0.12, 0.12, 0.14]);

// Default key light: direction toward the light is
// normalize(up·1 + right·(−0.5) + back·1), in the camera's frame.
export const KEY_LIGHT = Object.freeze({ up: 1, right: -0.5, back: 1, intensity: 1 });

// Declared lights: at most 4 top-level `light` blocks; intensity defaults to 1
// (D8).
export const MAX_LIGHTS = 4;
export const LIGHT_DEFAULTS = Object.freeze({ intensity: 1 });
