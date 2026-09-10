// Ray–box intersection by slabs, for a box of full size [x, y, z] centered at
// the local origin (DESIGN §8 Primitives). A cube is a box with equal sides.

import { EPSILON } from './constants.js';

const axisNormal = (axis, sign) => [0, 1, 2].map((i) => (i === axis ? sign : 0));

// Returns [] or [{ in, out }] with local outward normals. The direction need
// not be unit length; t is the caller's world distance. On a tie between
// slabs (an edge or corner), the lowest axis supplies the normal.
export function intersectBox(size, origin, direction, primitive) {
  let tIn = -Infinity;
  let tOut = Infinity;
  let inAxis = -1;
  let outAxis = -1;

  for (let axis = 0; axis < 3; axis++) {
    const half = size[axis] / 2;
    const o = origin[axis];
    const d = direction[axis];
    if (d === 0) {
      // Parallel to this slab: inside it for all t, or never.
      if (o < -half || o > half) return [];
      continue;
    }
    let t0 = (-half - o) / d;
    let t1 = (half - o) / d;
    if (t0 > t1) [t0, t1] = [t1, t0];
    if (t0 > tIn) {
      tIn = t0;
      inAxis = axis;
    }
    if (t1 < tOut) {
      tOut = t1;
      outAxis = axis;
    }
  }

  if (!(tOut - tIn > EPSILON)) return [];
  return [{
    in: { t: tIn, normal: axisNormal(inAxis, direction[inAxis] > 0 ? -1 : 1), primitive },
    out: { t: tOut, normal: axisNormal(outAxis, direction[outAxis] > 0 ? 1 : -1), primitive },
  }];
}
