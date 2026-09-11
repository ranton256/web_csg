// The property-block rules shared by `camera`, `light`, and `material` (DESIGN
// §8 Modeling language): each property at most once, unknown properties are
// errors, and each value must have the right kind. Also the vector-length
// check shared by camera `up` and light `direction` (D16).

import { length } from './vec3.js';

// Walks block.properties once, evaluating every value so all errors show.
// kinds maps each known property name to 'vector' or 'number'. Returns
// { given, usable, locs, valid }: given holds the names that appeared, usable
// the values of the right kind, and locs their locations. evaluate(node)
// returns a number, a 3-array, or null (already reported).
export function readProperties(block, kinds, evaluate, report) {
  const given = new Set();
  const usable = {};
  const locs = {};
  let valid = true;

  for (const property of block.properties) {
    const value = evaluate(property.value);
    if (!Object.hasOwn(kinds, property.name)) {
      report(property.loc, `unknown ${block.keyword} property \`${property.name}\``);
      valid = false;
      continue;
    }
    if (given.has(property.name)) {
      report(property.loc, `${block.keyword} property \`${property.name}\` is given more than once`);
      valid = false;
      continue;
    }
    given.add(property.name);
    locs[property.name] = property.loc;
    if (value === null) {
      valid = false;
      continue;
    }
    const kind = kinds[property.name];
    if (kind === 'vector' ? !Array.isArray(value) : typeof value !== 'number') {
      report(property.loc, `${block.keyword} property \`${property.name}\` must be a ${kind}`);
      valid = false;
      continue;
    }
    usable[property.name] = value;
  }
  return { given, usable, locs, valid };
}

// Reports a required property that did not appear, at the block.
export function missing(block, name, report) {
  report(block.loc, `${block.keyword} block is missing \`${name}\``);
}

// Why a direction-like vector cannot be used, or null when it can:
// - every component 0: 'must be nonzero';
// - a nonzero component, but the squares underflow to a length of 0: 'is too small';
// - a length that overflows to a non-finite value: 'is too large'.
// The last two are best effort outside the supported scene scale (D16).
export function lengthProblem(vector) {
  const size = length(vector);
  if (size === 0) return vector.some((component) => component !== 0) ? 'is too small' : 'must be nonzero';
  if (!Number.isFinite(size)) return 'is too large';
  return null;
}
