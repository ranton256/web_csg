// Interval lists along a ray, and the rules that combine them
// (DESIGN §8 Ray–solid intervals and tolerance). An interval is
// { in, out }, where each endpoint is { t, normal, primitive }.

import { EPSILON } from './constants.js';
import { dot, negate } from './vec3.js';

// The union of two interval lists, sorted by t. Intervals that overlap, or
// whose gap is ≤ ε, merge (so flush faces leave no seam); each merged
// interval keeps the endpoint objects of the boundaries that survive.
// Intervals of length ≤ ε are dropped.
export function union(a, b) {
  const sorted = [...a, ...b].sort((p, q) => p.in.t - q.in.t);
  const merged = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last !== undefined && interval.in.t <= last.out.t + EPSILON) {
      if (interval.out.t > last.out.t) merged[merged.length - 1] = { in: last.in, out: interval.out };
    } else {
      merged.push({ in: interval.in, out: interval.out });
    }
  }
  return merged.filter((interval) => interval.out.t - interval.in.t > EPSILON);
}

// The first boundary in front of the ray origin (t > ε), or null. When the
// origin is inside a solid, this is an exit boundary.
export function visibleHit(intervals) {
  for (const interval of intervals) {
    if (interval.in.t > EPSILON) return interval.in;
    if (interval.out.t > EPSILON) return interval.out;
  }
  return null;
}

// Two-sided shading: the normal, flipped if it faces away from the viewer.
export function facingNormal(normal, toViewer) {
  return dot(normal, toViewer) < 0 ? negate(normal) : normal;
}
