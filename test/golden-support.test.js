import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { expectMatchesGolden } from './support/golden.js';
import { decodePPM, encodePPM, readPPM, writePPM } from './support/ppm.js';

function solidImage(width, height, [r, g, b]) {
  const rgba = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    rgba.set([r, g, b, 255], pixel * 4);
  }
  return rgba;
}

describe('PPM format', () => {
  let tmp;
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-csg-ppm-')); });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  test('round trip preserves size and RGB values', () => {
    const width = 3;
    const height = 2;
    const rgba = new Uint8Array(width * height * 4);
    for (let i = 0; i < rgba.length; i++) rgba[i] = (i * 37) % 256;
    const file = path.join(tmp, 'round.ppm');
    writePPM(file, width, height, rgba);

    const image = readPPM(file);
    assert.equal(image.width, width);
    assert.equal(image.height, height);
    for (let pixel = 0; pixel < width * height; pixel++) {
      for (let channel = 0; channel < 3; channel++) {
        assert.equal(image.rgb[pixel * 3 + channel], rgba[pixel * 4 + channel]);
      }
    }
  });

  test('header is binary P6 with maximum value 255', () => {
    const buffer = encodePPM(1, 1, new Uint8Array([1, 2, 3, 255]));
    assert.equal(buffer.toString('ascii', 0, 11), 'P6\n1 1\n255\n');
  });

  test('malformed files are rejected with the file name', () => {
    const cases = {
      'ascii.ppm': Buffer.from('P3\n1 1\n255\n1 2 3\n'),
      'deep.ppm': Buffer.concat([Buffer.from('P6\n1 1\n65535\n'), Buffer.alloc(6)]),
      'short.ppm': Buffer.concat([Buffer.from('P6\n2 2\n255\n'), Buffer.alloc(5)]),
    };
    for (const [name, content] of Object.entries(cases)) {
      const file = path.join(tmp, name);
      fs.writeFileSync(file, content);
      assert.throws(() => readPPM(file), (error) => error.message.includes(file), name);
    }
  });

  test('header comments are skipped', () => {
    const buffer = Buffer.concat([Buffer.from('P6\n# comment\n1 1\n255\n'), Buffer.from([9, 8, 7])]);
    assert.deepEqual([...decodePPM(buffer).rgb], [9, 8, 7]);
  });
});

describe('golden comparison', () => {
  let tmp;
  let goldenDir;
  let actualDir;
  const width = 4;
  const height = 3;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-csg-golden-'));
    goldenDir = path.join(tmp, 'golden');
    actualDir = path.join(tmp, 'actual');
    writePPM(path.join(goldenDir, 'img.ppm'), width, height, solidImage(width, height, [100, 100, 100]));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const check = (name, w, h, rgba) => expectMatchesGolden(name, w, h, rgba, { goldenDir, actualDir, update: false });

  test('a difference of 1 per channel passes', () => {
    check('img', width, height, solidImage(width, height, [101, 99, 100]));
    assert.equal(fs.existsSync(actualDir), false);
  });

  test('a difference of 2 fails, reports counts, and writes the actual image', () => {
    const rgba = solidImage(width, height, [100, 100, 100]);
    rgba[0] = 102; // pixel 0, red
    rgba[4 * 5 + 2] = 130; // pixel 5, blue
    assert.throws(() => check('img', width, height, rgba), (error) => {
      assert.match(error.message, /"img"/);
      assert.match(error.message, /2 pixel\(s\) differ by more than 1/);
      assert.match(error.message, /largest channel difference 30/);
      return true;
    });
    const actual = readPPM(path.join(actualDir, 'img.actual.ppm'));
    assert.equal(actual.rgb[0], 102);
  });

  test('a size mismatch fails and reports both sizes', () => {
    assert.throws(
      () => check('img', 2, 2, solidImage(2, 2, [100, 100, 100])),
      /golden is 4×3 but the rendered image is 2×2/,
    );
    assert.ok(fs.existsSync(path.join(actualDir, 'img.actual.ppm')));
  });

  test('a missing golden fails and is not created', () => {
    assert.throws(
      () => check('absent', width, height, solidImage(width, height, [0, 0, 0])),
      /Golden image "absent" not found.*npm run golden:update/,
    );
    assert.equal(fs.existsSync(path.join(goldenDir, 'absent.ppm')), false);
  });

  test('update mode writes the golden', () => {
    const rgba = solidImage(width, height, [1, 2, 3]);
    expectMatchesGolden('fresh', width, height, rgba, { goldenDir, actualDir, update: true });
    const written = readPPM(path.join(goldenDir, 'fresh.ppm'));
    assert.deepEqual([...written.rgb.subarray(0, 3)], [1, 2, 3]);
    check('fresh', width, height, rgba);
  });
});
