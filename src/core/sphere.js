// Ray–sphere intersection for a sphere of the given radius at the local origin
// (DESIGN §8 Primitives; Ray–solid intervals and tolerance).

import { EPSILON } from './constants.js';
import { add, dot, scale } from './vec3.js';

// Returns the list of closed intervals where the ray is inside the sphere:
// [] or [{ in, out }], each endpoint { t, normal, primitive } with a local
// outward normal. The direction need not be unit length (a ray in a scaled
// local space), so t stays the caller's world distance. Tangent rays (an
// interval of length ≤ ε) miss.
export function intersectSphere(radius, origin, direction, primitive) {
  // |origin + t·direction|² = radius²  →  a·t² + 2b·t + c = 0
  const a = dot(direction, direction);
  const b = dot(origin, direction);
  const c = dot(origin, origin) - radius * radius;
  const discriminant = b * b - a * c;
  if (discriminant < 0) return [];

  const root = Math.sqrt(discriminant);
  const tIn = (-b - root) / a;
  const tOut = (-b + root) / a;
  if (tOut - tIn <= EPSILON) return [];

  const endpoint = (t) => ({
    t,
    normal: scale(add(origin, scale(direction, t)), 1 / radius),
    primitive,
  });
  return [{ in: endpoint(tIn), out: endpoint(tOut) }];
}
