// Ray–cylinder intersection for a capped cylinder along the local Z axis:
// x² + y² ≤ radius², z ∈ [-height/2, height/2] (DESIGN §8 Primitives).

import { EPSILON } from './constants.js';
import { length } from './vec3.js';

// Returns [] or [{ in, out }] with local outward normals: (x, y, 0)/radius on
// the side, (0, 0, ±1) on the caps. The direction need not be unit length;
// t is the caller's world distance. The interval is the side interval
// intersected with the cap slab; each end's normal comes from whichever bound
// decided it (the side wins a tie, at the rim).
export function intersectCylinder(radius, height, origin, direction, primitive) {
  const [ox, oy, oz] = origin;
  const [dx, dy, dz] = direction;
  const half = height / 2;
  // A ray along the side line or in a cap plane is a hit (closed solids, D20).
  // The check allows ε in world units, which is ε·|direction| here.
  const tolerance = EPSILON * length(direction);

  // Side: (ox + t·dx)² + (oy + t·dy)² = radius²
  let sideIn = -Infinity;
  let sideOut = Infinity;
  const a = dx * dx + dy * dy;
  if (a === 0) {
    // Parallel to the axis: inside the side for all t, or never.
    const reach = radius + tolerance;
    if (ox * ox + oy * oy > reach * reach) return [];
  } else {
    const b = ox * dx + oy * dy;
    const c = ox * ox + oy * oy - radius * radius;
    const discriminant = b * b - a * c;
    if (discriminant < 0) return [];
    const root = Math.sqrt(discriminant);
    sideIn = (-b - root) / a;
    sideOut = (-b + root) / a;
  }

  // Caps: z between -half and half.
  let capIn = -Infinity;
  let capOut = Infinity;
  if (dz === 0) {
    if (oz < -half - tolerance || oz > half + tolerance) return [];
  } else {
    capIn = (-half - oz) / dz;
    capOut = (half - oz) / dz;
    if (capIn > capOut) [capIn, capOut] = [capOut, capIn];
  }

  const tIn = Math.max(sideIn, capIn);
  const tOut = Math.min(sideOut, capOut);
  if (!(tOut - tIn > EPSILON)) return [];

  const sideNormal = (t) => [(ox + t * dx) / radius, (oy + t * dy) / radius, 0];
  return [{
    in: { t: tIn, normal: sideIn >= capIn ? sideNormal(tIn) : [0, 0, dz > 0 ? -1 : 1], primitive },
    out: { t: tOut, normal: sideOut <= capOut ? sideNormal(tOut) : [0, 0, dz > 0 ? 1 : -1], primitive },
  }];
}
