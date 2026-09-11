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

// The coverage shared by two normalized lists (sorted, disjoint), as in an
// intersection. Each result endpoint is whichever operand's boundary bounds
// it; on an exact tie, a's endpoint is kept, so the normal choice is
// deterministic. Intervals of length ≤ ε are dropped.
export function intersect(a, b) {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const p = a[i];
    const q = b[j];
    const start = q.in.t > p.in.t ? q.in : p.in;
    const end = q.out.t < p.out.t ? q.out : p.out;
    if (end.t - start.t > EPSILON) result.push({ in: start, out: end });
    // Move past whichever interval ends first.
    if (p.out.t <= q.out.t) i++;
    else j++;
  }
  return result;
}

// A cutter boundary exposed by a difference: its normal reversed so it points
// into the cut, in a new endpoint that keeps the cutter's primitive.
const reversed = (end) => ({ ...end, normal: negate(end.normal) });

// The coverage of a that b does not cover, as in a difference: a and b are
// normalized lists. Boundaries taken from b get reversed normals. On an exact
// tie, b wins: the base boundary is removed, so a flush cut opens the face.
// Intervals of length ≤ ε are dropped, so a cutter boundary within ε of a base
// boundary removes that boundary too (DESIGN §8 Ray–solid intervals).
export function subtract(a, b) {
  const result = [];
  const keep = (start, end) => {
    if (end.t - start.t > EPSILON) result.push({ in: start, out: end });
  };
  let j = 0;
  for (const p of a) {
    // Cutters that end before this interval starts cannot touch it, or any
    // later one.
    while (j < b.length && b[j].out.t <= p.in.t) j++;
    let start = p.in;
    let open = true;
    let k = j;
    for (; k < b.length && b[k].in.t < p.out.t; k++) {
      const q = b[k];
      if (q.in.t > start.t) keep(start, reversed(q.in));
      if (q.out.t >= p.out.t) {
        open = false;
        break;
      }
      if (q.out.t > start.t) start = reversed(q.out);
    }
    if (open) keep(start, p.out);
    // A cutter that reaches past this interval may cut the next one too.
    j = k;
  }
  return result;
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
