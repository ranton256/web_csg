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

  // The header is examined byte by byte. PPM whitespace is ASCII only (space,
  // TAB, LF, VT, FF, CR). Tokens are decoded as latin1, which maps each byte to
  // the same code point; 'ascii' decoding would clear the high bit and turn
  // byte 0xB2 into "2".
  const isSpace = (byte) => byte === 0x20 || (byte >= 0x09 && byte <= 0x0d);

  let offset = 0;
  // Reads the next header token, skipping whitespace and # comments.
  const nextToken = () => {
    for (;;) {
      while (offset < buffer.length && isSpace(buffer[offset])) offset++;
      if (buffer[offset] !== 0x23) break; // '#'
      while (offset < buffer.length && buffer[offset] !== 0x0a) offset++;
    }
    const start = offset;
    while (offset < buffer.length && !isSpace(buffer[offset])) offset++;
    return buffer.toString('latin1', start, offset);
  };

  // Header numbers are plain decimal digits in PPM; Number() alone would
  // also accept "0xFF", "2e0", or "+2".
  const nextDecimal = (field) => {
    const token = nextToken();
    if (!/^\d+$/.test(token)) fail(`${field} "${token}" is not a decimal integer`);
    return Number(token);
  };

  if (nextToken() !== 'P6') fail('not a binary P6 image');
  const width = nextDecimal('width');
  const height = nextDecimal('height');
  const maxValue = nextDecimal('maximum value');
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    fail('invalid width or height');
  }
  if (maxValue !== 255) fail(`maximum value is ${maxValue}; expected 255`);
  // Exactly one whitespace byte separates the header from the pixels.
  if (!isSpace(buffer[offset])) fail('missing whitespace after the maximum value');
  offset++;

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
