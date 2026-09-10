// The core's entry points (DESIGN §7): compile source to a scene, and render a
// scene, whole or in row bands, into an RGBA buffer. No browser APIs.

import { cameraBasis, primaryRay } from './camera.js';
import { BACKGROUND, DEFAULT_COLOR } from './constants.js';
import { evaluate } from './evaluate.js';
import { facingNormal, union, visibleHit } from './intervals.js';
import { SourceError, tokenize } from './lexer.js';
import { parse } from './parser.js';
import { encode, keyLight, shade } from './shade.js';
import { intersectSphere } from './sphere.js';
import { negate } from './vec3.js';

// Returns { diagnostics, scene }; scene is null when there are diagnostics.
// Diagnostics are { line, column, message } with 1-based positions.
export function compile(source) {
  let program;
  try {
    program = parse(tokenize(source));
  } catch (error) {
    if (!(error instanceof SourceError)) throw error;
    return { diagnostics: [{ line: error.line, column: error.column, message: error.message }], scene: null };
  }
  return evaluate(program);
}

function checkSize(width, height) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new RangeError(`image size must be positive integers, got ${width}×${height}`);
  }
}

function intersectSolid(solid, ray) {
  switch (solid.type) {
    case 'sphere':
      return intersectSphere(solid.radius, ray.origin, ray.direction, solid);
    default:
      throw new Error(`unknown solid type ${solid.type}`);
  }
}

// Renders rows [y0, y1) of a width × height image of scene into rgba, a
// buffer of width·height·4 bytes (row-major, top row first). Any split of the
// rows into bands produces the same bytes as one full render.
export function renderRows(scene, width, height, y0, y1, rgba) {
  checkSize(width, height);
  if (!Number.isInteger(y0) || !Number.isInteger(y1) || y0 < 0 || y0 > y1 || y1 > height) {
    throw new RangeError(`rows [${y0}, ${y1}) are outside 0..${height}`);
  }
  if (rgba.length !== width * height * 4) {
    throw new RangeError(`buffer has ${rgba.length} bytes; ${width}×${height} RGBA needs ${width * height * 4}`);
  }

  const basis = cameraBasis(scene.camera);
  const lights = [keyLight(basis)];
  const background = BACKGROUND.map(encode);

  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < width; x++) {
      const ray = primaryRay(basis, width, height, x, y);
      // Several top-level solids form their union (DESIGN §8 Implicit union).
      let intervals = [];
      for (const solid of scene.solids) intervals = union(intervals, intersectSolid(solid, ray));
      const hit = visibleHit(intervals);

      const i = (y * width + x) * 4;
      if (hit === null) {
        rgba[i] = background[0];
        rgba[i + 1] = background[1];
        rgba[i + 2] = background[2];
      } else {
        const toViewer = negate(ray.direction);
        const color = shade(facingNormal(hit.normal, toViewer), toViewer, lights, DEFAULT_COLOR);
        rgba[i] = encode(color[0]);
        rgba[i + 1] = encode(color[1]);
        rgba[i + 2] = encode(color[2]);
      }
      rgba[i + 3] = 255;
    }
  }
}

// Returns { diagnostics, rgba }: rgba is a Uint8ClampedArray of
// width·height·4 bytes, or null when the source has diagnostics.
export function renderSource(source, width, height) {
  checkSize(width, height);
  const { diagnostics, scene } = compile(source);
  if (scene === null) return { diagnostics, rgba: null };
  const rgba = new Uint8ClampedArray(width * height * 4);
  renderRows(scene, width, height, 0, height, rgba);
  return { diagnostics, rgba };
}
