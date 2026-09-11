// The `light` and `material` blocks (DESIGN §8 Lighting and shading, D8):
// their property rules, and the values they contribute to the scene. Where
// the blocks may appear, and how many, is checked by the evaluator.

import { LIGHT_DEFAULTS } from './constants.js';
import { lengthProblem, missing, readProperties } from './properties.js';
import { negate, normalize } from './vec3.js';

const LIGHT_KINDS = { direction: 'vector', position: 'vector', intensity: 'number' };
const MATERIAL_KINDS = { color: 'vector' };

// Returns a directional light { kind, toLight, intensity } or a point light
// { kind, position, intensity }, or null after reporting every problem. A block
// has exactly one of direction and position (D25). direction is the direction
// the light travels, so the unit vector toward the light is its negation,
// normalized. Any finite position is valid.
export function validateLight(block, evaluate, report) {
  const { given, usable, locs, valid: propertiesValid } = readProperties(block, LIGHT_KINDS, evaluate, report);
  let valid = propertiesValid;
  if (!given.has('direction') && !given.has('position')) {
    missing(block, ['direction', 'position'], report);
    valid = false;
  }
  if (given.has('direction') && given.has('position')) {
    const names = block.properties.map((property) => property.name);
    const second = names.indexOf('direction') > names.indexOf('position') ? 'direction' : 'position';
    report(locs[second], 'light block cannot have both `direction` and `position`');
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
  return given.has('direction')
    ? { kind: 'directional', toLight: normalize(negate(usable.direction)), intensity }
    : { kind: 'point', position: usable.position, intensity };
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
