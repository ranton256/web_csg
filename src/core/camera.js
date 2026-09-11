// The camera block: validation and defaults (DESIGN §8 Camera definition), and
// the mapping from pixels to rays (vertical field of view, pixel centers).

import { CAMERA_DEFAULTS, EPSILON, PARALLEL_TOLERANCE } from './constants.js';
import { lengthProblem, missing, readProperties } from './properties.js';
import { add, cross, length, normalize, scale, sub } from './vec3.js';

const KINDS = { position: 'vector', lookAt: 'vector', up: 'vector', fov: 'number' };
const REQUIRED = ['position', 'lookAt'];

// Returns { position, lookAt, up, fov }, or null after reporting diagnostics.
// evaluate(node) returns a number, a 3-array, or null (already reported).
export function validateCamera(node, evaluate, report) {
  // The shared property-block rules (unknown, duplicate, and mistyped properties).
  const { given, usable, locs, valid: propertiesValid } = readProperties(node, KINDS, evaluate, report);
  let valid = propertiesValid;
  for (const name of REQUIRED) {
    if (!given.has(name)) {
      missing(node, name, report);
      valid = false;
    }
  }

  // Each remaining rule is checked whenever the values it needs are usable, so
  // independent problems are all reported.
  const withDefault = (name) => (given.has(name) ? usable[name] : CAMERA_DEFAULTS[name]);
  const camera = {
    position: usable.position,
    lookAt: usable.lookAt,
    up: withDefault('up'),
    fov: withDefault('fov'),
  };

  let viewValid = false;
  if (camera.position !== undefined && camera.lookAt !== undefined) {
    const distance = length(sub(camera.lookAt, camera.position));
    if (!Number.isFinite(distance)) {
      // Beyond the supported scale the math is best effort (D16); an overflow
      // is reported as such, not as a misleading up-vector error.
      report(locs.lookAt, 'position and lookAt are too far apart');
      valid = false;
    } else {
      viewValid = distance > EPSILON;
      if (!viewValid) {
        report(locs.lookAt, 'position and lookAt must differ');
        valid = false;
      }
    }
  }
  if (camera.up !== undefined) {
    // Zero, or too small or too large to measure (D16): reported as such,
    // never as parallel.
    const problem = lengthProblem(camera.up);
    if (problem !== null) {
      report(locs.up ?? node.loc, `up ${problem}`);
      valid = false;
    } else if (viewValid) {
      const view = normalize(sub(camera.lookAt, camera.position));
      if (length(cross(view, normalize(camera.up))) <= PARALLEL_TOLERANCE) {
        report(locs.up ?? node.loc, 'up must not be parallel to the viewing direction');
        valid = false;
      }
    }
  }
  if (camera.fov !== undefined && !(camera.fov > 0 && camera.fov < 180)) {
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
