// Proves the golden-image path end to end with a fixed synthetic image.
// Real renders replace this as the renderer arrives (M1 onward).

import { test } from 'node:test';
import { expectMatchesGolden } from './support/golden.js';

const WIDTH = 64;
const HEIGHT = 48;

function gradient() {
  const rgba = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      rgba.set([x * 4, y * 5, (x + y) * 2, 255], (y * WIDTH + x) * 4);
    }
  }
  return rgba;
}

test('synthetic gradient matches test/golden/smoke.ppm', () => {
  expectMatchesGolden('smoke', WIDTH, HEIGHT, gradient());
});
