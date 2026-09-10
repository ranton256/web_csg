// The camera block: validation and defaults (DESIGN §8 Camera definition), and
// the mapping from pixels to rays (vertical field of view, pixel centers).

import { CAMERA_DEFAULTS, EPSILON, PARALLEL_TOLERANCE } from './constants.js';
import { add, cross, length, normalize, scale, sub } from './vec3.js';

const KINDS = { position: 'vector', lookAt: 'vector', up: 'vector', fov: 'number' };
const REQUIRED = ['position', 'lookAt'];

// Returns { position, lookAt, up, fov }, or null after reporting diagnostics.
// evaluate(node) returns a number, a 3-array, or null (already reported).
export function validateCamera(node, evaluate, report) {
  const values = {};
  const locs = {};
  let valid = true;

  for (const property of node.properties) {
    const value = evaluate(property.value);
    if (!Object.hasOwn(KINDS, property.name)) {
      report(property.loc, `unknown camera property \`${property.name}\``);
      valid = false;
      continue;
    }
    if (Object.hasOwn(values, property.name)) {
      report(property.loc, `camera property \`${property.name}\` is given more than once`);
      valid = false;
      continue;
    }
    values[property.name] = value;
    locs[property.name] = property.loc;
    if (value === null) {
      valid = false;
      continue;
    }
    const kind = KINDS[property.name];
    if (kind === 'vector' ? !Array.isArray(value) : typeof value !== 'number') {
      report(property.loc, `camera property \`${property.name}\` must be a ${kind}`);
      valid = false;
    }
  }

  for (const name of REQUIRED) {
    if (!Object.hasOwn(values, name)) {
      report(node.loc, `camera block is missing \`${name}\``);
      valid = false;
    }
  }
  if (!valid) return null;

  const camera = {
    position: values.position,
    lookAt: values.lookAt,
    up: values.up ?? CAMERA_DEFAULTS.up,
    fov: values.fov ?? CAMERA_DEFAULTS.fov,
  };

  const view = sub(camera.lookAt, camera.position);
  const viewValid = length(view) > EPSILON;
  if (!viewValid) {
    report(locs.lookAt, 'position and lookAt must differ');
    valid = false;
  }
  if (length(camera.up) === 0) {
    report(locs.up ?? node.loc, 'up must be nonzero');
    valid = false;
  } else if (viewValid && length(cross(normalize(view), normalize(camera.up))) <= PARALLEL_TOLERANCE) {
    report(locs.up ?? node.loc, 'up must not be parallel to the viewing direction');
    valid = false;
  }
  if (!(camera.fov > 0 && camera.fov < 180)) {
    report(locs.fov, 'fov must be strictly between 0 and 180 degrees');
    valid = false;
  }
  return valid ? camera : null;
}

// An orthonormal camera frame: forward, right, and up (re-orthogonalized).
export function cameraBasis(camera) {
  const forward = normalize(sub(camera.lookAt, camera.position));
  const right = normalize(cross(forward, camera.up));
  const up = cross(right, forward);
  return { position: camera.position, forward, right, up, tanHalfFov: Math.tan((camera.fov * Math.PI) / 360) };
}

// The ray through the center of pixel (x, y); row 0 is the top of the image.
// The image height spans the vertical fov; pixels are square.
export function primaryRay(basis, width, height, x, y) {
  const sx = ((2 * (x + 0.5)) / width - 1) * basis.tanHalfFov * (width / height);
  const sy = (1 - (2 * (y + 0.5)) / height) * basis.tanHalfFov;
  const direction = normalize(add(add(basis.forward, scale(basis.right, sx)), scale(basis.up, sy)));
  return { origin: basis.position, direction };
}
