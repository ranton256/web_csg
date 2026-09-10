// Ray–sphere intersection for a sphere of the given radius at the origin
// (DESIGN §8 Primitives; Ray–solid intervals and tolerance).

import { EPSILON } from './constants.js';
import { add, dot, scale } from './vec3.js';

// Returns the list of closed intervals where the ray is inside the sphere:
// [] or [{ in, out }], each endpoint { t, normal, primitive }. The direction
// must be a unit vector, so t is world distance. Tangent rays (an interval of
// length ≤ ε) miss.
export function intersectSphere(radius, origin, direction, primitive) {
  // |origin + t·direction|² = radius²  →  t² + 2bt + c = 0
  const b = dot(origin, direction);
  const c = dot(origin, origin) - radius * radius;
  const discriminant = b * b - c;
  if (discriminant < 0) return [];

  const root = Math.sqrt(discriminant);
  const tIn = -b - root;
  const tOut = -b + root;
  if (tOut - tIn <= EPSILON) return [];

  const endpoint = (t) => ({
    t,
    normal: scale(add(origin, scale(direction, t)), 1 / radius),
    primitive,
  });
  return [{ in: endpoint(tIn), out: endpoint(tOut) }];
}
