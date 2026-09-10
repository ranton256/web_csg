// Blinn-Phong shading and 8-bit encoding (DESIGN §8 Lighting and shading).

import { KEY_LIGHT, SHADING } from './constants.js';
import { add, dot, length, normalize, scale } from './vec3.js';

// The default key light, fixed relative to the camera frame from cameraBasis.
export function keyLight(basis) {
  const toLight = normalize(add(
    add(scale(basis.up, KEY_LIGHT.up), scale(basis.right, KEY_LIGHT.right)),
    scale(basis.forward, -KEY_LIGHT.back),
  ));
  return { toLight, intensity: KEY_LIGHT.intensity };
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
