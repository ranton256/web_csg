// Placements of solids (DESIGN §8 Transforms): world = s·R·local + t, where R
// is a rotation (orthonormal) and s > 0 is a uniform scale. Nested transform
// blocks compose into one placement per primitive.

import { add, scale, sub } from './vec3.js';

const IDENTITY_MATRIX = Object.freeze([
  Object.freeze([1, 0, 0]),
  Object.freeze([0, 1, 0]),
  Object.freeze([0, 0, 1]),
]);

export const IDENTITY = Object.freeze({ s: 1, R: IDENTITY_MATRIX, t: Object.freeze([0, 0, 0]) });

const multiplyVector = (M, v) => [
  M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
  M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
  M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
];

// Mᵀ·v; for a rotation, the transpose is the inverse.
const multiplyTransposeVector = (M, v) => [
  M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2],
  M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2],
  M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2],
];

const multiplyMatrices = (A, B) => [0, 1, 2].map((i) => [0, 1, 2].map((j) =>
  A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]));

// Sine and cosine of an angle in degrees. Exact multiples of 90° use exact
// values (0, ±1), so right-angle rotations map axes to axes exactly (DESIGN §5).
const RIGHT_ANGLE_SINES = [0, 1, 0, -1];
const quarterTurns = (degrees) => (((degrees / 90) % 4) + 4) % 4;

export function sinDeg(degrees) {
  if (Number.isInteger(degrees / 90)) return RIGHT_ANGLE_SINES[quarterTurns(degrees)];
  return Math.sin((degrees * Math.PI) / 180);
}

export function cosDeg(degrees) {
  if (Number.isInteger(degrees / 90)) return RIGHT_ANGLE_SINES[(quarterTurns(degrees) + 1) % 4];
  return Math.cos((degrees * Math.PI) / 180);
}

export const translation = (offset) => ({ s: 1, R: IDENTITY_MATRIX, t: [...offset] });

export const scaling = (factor) => ({ s: factor, R: IDENTITY_MATRIX, t: [0, 0, 0] });

// rotate([rx, ry, rz]): about X by rx, then Y by ry, then Z by rz, about fixed
// parent axes; R = Rz·Ry·Rx, right-handed, in degrees (DESIGN §5, D4).
export function rotation([rx, ry, rz]) {
  const [sx, cx, sy, cy, sz, cz] = [sinDeg(rx), cosDeg(rx), sinDeg(ry), cosDeg(ry), sinDeg(rz), cosDeg(rz)];
  const Rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]];
  const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
  const Rz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]];
  return { s: 1, R: multiplyMatrices(Rz, multiplyMatrices(Ry, Rx)), t: [0, 0, 0] };
}

// The placement of a child inside a parent: world = parent(child(local)).
export function compose(parent, child) {
  return {
    s: parent.s * child.s,
    R: multiplyMatrices(parent.R, child.R),
    t: add(scale(multiplyVector(parent.R, child.t), parent.s), parent.t),
  };
}

export const toWorld = (placement, point) =>
  add(scale(multiplyVector(placement.R, point), placement.s), placement.t);

// A world ray in the placement's local space. The direction is NOT
// renormalized, so the ray parameter t keeps meaning world distance.
export function toLocal(placement, origin, direction) {
  return {
    origin: scale(multiplyTransposeVector(placement.R, sub(origin, placement.t)), 1 / placement.s),
    direction: scale(multiplyTransposeVector(placement.R, direction), 1 / placement.s),
  };
}

// A local unit normal in world space. Uniform scale does not change normal
// directions, so only the rotation applies, and the result stays unit length.
export const normalToWorld = (placement, normal) => multiplyVector(placement.R, normal);
