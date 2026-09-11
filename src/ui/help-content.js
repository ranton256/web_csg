// The in-app reference for the modeling language (DESIGN §8; D23), shown in
// the Help dialog. Plain data with no browser APIs, so Node tests can check
// that it covers the language and that its example compiles.
//
// Each section has a title and a body of blocks: a string is a paragraph, and
// { code } is a code sample.

export const HELP_EXAMPLE = `// A cube with a bore, lit from above.
let size = 40;

camera {
  position: [90, -120, 80];
  lookAt: [0, 0, 0];
}

difference {
  cube(size);
  cylinder(radius: 10, height: size + 2);
}

light { direction: [0.3, 0.6, -1]; }
material { color: [0.4, 0.6, 0.9]; }
`;

export const HELP_SECTIONS = [
  {
    title: 'Statements and comments',
    body: [
      'A source is a list of statements. Statements end with `;`, and blocks end with `}`. Comments run from `//` to the end of the line, or between `/*` and `*/`.',
      'Numbers are decimals such as `12` or `1.5` (no exponents). Vectors are `[x, y, z]`. Arithmetic uses `+ - * /` and parentheses; a vector can be added to a vector or multiplied by a number. Z is up.',
    ],
  },
  {
    title: 'let',
    body: [
      '`let name = expression;` binds a number or a vector. A name is visible from after its declaration to the end of its block. It cannot be redeclared, even inside a nested block.',
      { code: 'let r = 12;\nlet offset = [r, 0, 0] * 2;' },
    ],
  },
  {
    title: 'Primitives',
    body: [
      'Every primitive is centered at its local origin, and every dimension must be greater than 0. Arguments are positional, in the order shown, or named.',
      { code: 'sphere(radius);\ncube(size);\nbox([x, y, z]);\ncylinder(radius, height);   // along Z\ncylinder(height: 62, radius: 12);' },
    ],
  },
  {
    title: 'Transforms',
    body: [
      '`translate(vector)`, `rotate(vector)`, and `scale(number)` each take one argument and a braced body. `rotate([rx, ry, rz])` turns by degrees: first about X, then Y, then Z, about fixed axes. `scale` is uniform and must be greater than 0. Inner blocks apply first, and several solids in a body form one union.',
      { code: 'translate([30, 0, 0]) {\n  rotate([0, 0, 45]) { cube(20); }\n}' },
    ],
  },
  {
    title: 'Booleans',
    body: [
      '`union { … }` joins its children. `intersection { … }` keeps only what all of its children share. `difference { … }` is its first child minus all the others.',
      { code: 'difference {\n  cube(30);\n  sphere(18);\n}' },
    ],
  },
  {
    title: 'camera',
    body: [
      'Exactly one `camera` block, at the top level. `position` and `lookAt` are required. `up` defaults to `[0, 0, 1]`, and `fov` (the vertical field of view, in degrees, between 0 and 180) defaults to 45.',
      { code: 'camera { position: [120, -160, 100]; lookAt: [0, 0, 0]; up: [0, 0, 1]; fov: 45; }' },
    ],
  },
  {
    title: 'light',
    body: [
      'Up to four `light` blocks, at the top level. Each is a white light shining in one direction: `direction` is the way the light travels (required, nonzero), and `intensity` defaults to 1 and must be at least 0. With no `light` block, a default key light follows the camera.',
      { code: 'light { direction: [0, 0, -1]; intensity: 0.8; }' },
    ],
  },
  {
    title: 'material',
    body: [
      'At most one `material` block, at the top level. `color` is required, each component between 0 and 1; it sets the color of every solid. Without it, solids are light grey (`[0.8, 0.8, 0.8]`). Highlights stay white.',
      { code: 'material { color: [0.9, 0.35, 0.2]; }' },
    ],
  },
  {
    title: 'Example',
    body: [{ code: HELP_EXAMPLE }],
  },
];

// Every piece of text in the help, as one string (for coverage checks).
export function helpText() {
  return HELP_SECTIONS.flatMap((section) => [section.title, ...section.body.map((block) => (typeof block === 'string' ? block : block.code))]).join('\n');
}
