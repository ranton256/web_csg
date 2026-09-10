// Binary PPM (P6, maximum value 255, RGB) encoding for golden images.
// Images are passed around as RGBA buffers; the alpha channel is not stored.

import fs from 'node:fs';
import path from 'node:path';

export function encodePPM(width, height, rgba) {
  if (rgba.length !== width * height * 4) {
    throw new Error(`RGBA buffer has ${rgba.length} bytes; expected ${width * height * 4} for ${width}×${height}`);
  }
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, 'ascii');
  const rgb = Buffer.alloc(width * height * 3);
  for (let pixel = 0; pixel < width * height; pixel++) {
    rgb[pixel * 3] = rgba[pixel * 4];
    rgb[pixel * 3 + 1] = rgba[pixel * 4 + 1];
    rgb[pixel * 3 + 2] = rgba[pixel * 4 + 2];
  }
  return Buffer.concat([header, rgb]);
}

// Returns { width, height, rgb }. `name` is used in error messages.
export function decodePPM(buffer, name = '<buffer>') {
  const fail = (reason) => {
    throw new Error(`Invalid PPM ${name}: ${reason}`);
  };

  let offset = 0;
  // Reads the next header token, skipping whitespace and # comments.
  const nextToken = () => {
    for (;;) {
      while (offset < buffer.length && /\s/.test(String.fromCharCode(buffer[offset]))) offset++;
      if (buffer[offset] !== 0x23) break; // '#'
      while (offset < buffer.length && buffer[offset] !== 0x0a) offset++;
    }
    const start = offset;
    while (offset < buffer.length && !/\s/.test(String.fromCharCode(buffer[offset]))) offset++;
    return buffer.toString('ascii', start, offset);
  };

  if (nextToken() !== 'P6') fail('not a binary P6 image');
  const width = Number(nextToken());
  const height = Number(nextToken());
  const maxValue = Number(nextToken());
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    fail('invalid width or height');
  }
  if (maxValue !== 255) fail(`maximum value is ${maxValue}; expected 255`);
  offset++; // exactly one whitespace byte separates the header from the pixels

  const rgb = buffer.subarray(offset);
  if (rgb.length !== width * height * 3) {
    fail(`pixel data has ${rgb.length} bytes; expected ${width * height * 3}`);
  }
  return { width, height, rgb: new Uint8Array(rgb) };
}

export function writePPM(file, width, height, rgba) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, encodePPM(width, height, rgba));
}

export function readPPM(file) {
  return decodePPM(fs.readFileSync(file), file);
}
