// Fixed scenes shared by golden tests and milestone captures.

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
};
