// Fixed scenes shared by golden tests and milestone captures.

import { VISION_EXAMPLE } from './vision-example.js';

// M5: the bored cube under declared lights and a material color.
// A key light from above the front (top bright, front medium) and a dim light
// travelling toward -X, which alone lights the right face.
const TWO_LIGHTS = 'light { direction: [0.3, 0.6, -1]; intensity: 0.9; }\nlight { direction: [-1, 0, 0]; intensity: 0.35; }\n';
const WARM = 'material { color: [0.9, 0.35, 0.2]; }\n';

const CAMERA = 'camera {\n  position: [120, -160, 100];\n  lookAt: [0, 0, 0];\n}\n\n';

export const SCENES = {
  cube: `${CAMERA}cube(50);\n`,
  box: `${CAMERA}box([70, 40, 25]);\n`,
  cylinder: `${CAMERA}cylinder(radius: 25, height: 60);\n`,
  arrangement: `// All four primitives, placed with translate, rotate, and scale.
camera {
  position: [160, -220, 140];
  lookAt: [0, 0, 0];
}

translate([-45, 0, 0]) { sphere(20); }
translate([0, 45, 0]) { rotate([0, 0, 30]) { cube(30); } }
translate([45, 0, 0]) { rotate([90, 0, 0]) { cylinder(radius: 15, height: 40); } }
translate([0, -45, 0]) { scale(1.5) { box([30, 15, 10]); } }
`,
  booleans: `// A union, an intersection, and a difference, side by side.
camera {
  position: [70, -150, 80];
  lookAt: [0, 0, 0];
}

translate([-50, 0, 0]) { union { cube(24); sphere(16); } }
intersection { cube(28); sphere(18); }
translate([50, 0, 0]) { difference { cube(28); sphere(18); } }
`,
  'lit-one': `${VISION_EXAMPLE}\nlight { direction: [1, 1, -1.5]; }\n`,
  'lit-two': `${VISION_EXAMPLE}\n${TWO_LIGHTS}`,
  'lit-material': `${VISION_EXAMPLE}\n${WARM}`,
  'lit-custom': `${VISION_EXAMPLE}\n${TWO_LIGHTS}${WARM}`,
};
