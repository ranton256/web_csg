// The `light` and `material` blocks (DESIGN §8 Lighting and shading, D8):
// their property rules, and the values they contribute to the scene. Where
// the blocks may appear, and how many, is checked by the evaluator.

import { LIGHT_DEFAULTS } from './constants.js';
import { lengthProblem, missing, readProperties } from './properties.js';
import { negate, normalize } from './vec3.js';

const LIGHT_KINDS = { direction: 'vector', intensity: 'number' };
const MATERIAL_KINDS = { color: 'vector' };

// Returns { toLight, intensity }, or null after reporting every problem.
// direction is the direction the light travels, so the unit vector toward the
// light is its negation, normalized.
export function validateLight(block, evaluate, report) {
  const { given, usable, locs, valid: propertiesValid } = readProperties(block, LIGHT_KINDS, evaluate, report);
  let valid = propertiesValid;
  if (!given.has('direction')) {
    missing(block, 'direction', report);
    valid = false;
  }
  if (usable.direction !== undefined) {
    const problem = lengthProblem(usable.direction);
    if (problem !== null) {
      report(locs.direction, `direction ${problem}`);
      valid = false;
    }
  }
  if (usable.intensity !== undefined && !(usable.intensity >= 0)) {
    report(locs.intensity, 'intensity must be at least 0');
    valid = false;
  }
  if (!valid) return null;
  const intensity = given.has('intensity') ? usable.intensity : LIGHT_DEFAULTS.intensity;
  return { toLight: normalize(negate(usable.direction)), intensity };
}

// Returns the model color, or null after reporting every problem.
export function validateMaterial(block, evaluate, report) {
  const { given, usable, locs, valid: propertiesValid } = readProperties(block, MATERIAL_KINDS, evaluate, report);
  let valid = propertiesValid;
  if (!given.has('color')) {
    missing(block, 'color', report);
    valid = false;
  }
  if (usable.color !== undefined && !usable.color.every((component) => component >= 0 && component <= 1)) {
    report(locs.color, 'each color component must be between 0 and 1');
    valid = false;
  }
  return valid ? usable.color : null;
}
