// Blinn-Phong shading and 8-bit encoding (DESIGN §8 Lighting and shading).

import { EPSILON, KEY_LIGHT, SHADING } from './constants.js';
import { add, dot, length, normalize, scale, sub } from './vec3.js';

// The default key light, fixed relative to the camera frame from cameraBasis.
export function keyLight(basis) {
  const toLight = normalize(add(
    add(scale(basis.up, KEY_LIGHT.up), scale(basis.right, KEY_LIGHT.right)),
    scale(basis.forward, -KEY_LIGHT.back),
  ));
  return { kind: 'directional', toLight, intensity: KEY_LIGHT.intensity };
}

// The lights as seen from one shaded point, for shade(). A directional light
// is unchanged. A point light becomes { toLight, intensity }, with toLight the
// unit vector from the point toward its position, and no falloff. Within ε of
// its position, or at a distance too large to compute, a point light
// contributes nothing (D25).
export function lightsAt(lights, point) {
  const result = [];
  for (const light of lights) {
    if (light.kind !== 'point') {
      result.push(light);
      continue;
    }
    const toPosition = sub(light.position, point);
    const distance = length(toPosition);
    if (!(distance > EPSILON) || !Number.isFinite(distance)) continue;
    result.push({ toLight: scale(toPosition, 1 / distance), intensity: light.intensity });
  }
  return result;
}

// c = ambient·C + Σ I·(diffuse·max(0, N·L)·C + s), where the specular term
// s = specular·max(0, N·H)^shininess applies only when N·L > 0.
// All vectors are unit length. Returns [r, g, b], each clamped to [0, 1].
export function shade(normal, toViewer, lights, color) {
  const result = color.map((channel) => SHADING.ambient * channel);
  for (const light of lights) {
    const nDotL = dot(normal, light.toLight);
    if (nDotL <= 0) continue; // no diffuse, and the specular gate is closed
    const halfway = add(light.toLight, toViewer);
    const halfwayLength = length(halfway);
    const specular = halfwayLength === 0
      ? 0
      : SHADING.specular * Math.max(0, dot(normal, scale(halfway, 1 / halfwayLength))) ** SHADING.shininess;
    for (let k = 0; k < 3; k++) {
      result[k] += light.intensity * (SHADING.diffuse * nDotL * color[k] + specular);
    }
  }
  return result.map((channel) => Math.min(1, Math.max(0, channel)));
}

// One channel in [0, 1] (clamped if outside) to a byte: round(255 · c).
export const encode = (channel) => Math.round(255 * Math.min(1, Math.max(0, channel)));
