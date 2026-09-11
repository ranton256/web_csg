// The built-in examples (DESIGN §8 Save, load, and examples; §4 asset
// inventory; D6). Plain data with no browser APIs, so Node tests compile and
// render every example.

// The vision.md example, verbatim: a cube minus three orthogonal cylinders.
export const BORED_CUBE_SOURCE = `// Coordinates use Z as up.
// All primitives are centered at their local origin.

let size = 60;
let bore = 12;

camera {
  position: [120, -160, 100];
  lookAt: [0, 0, 0];
  up: [0, 0, 1];
  fov: 45;
}

difference {
  cube(size);

  union {
    cylinder(radius: bore, height: size + 2);

    rotate([90, 0, 0]) {
      cylinder(radius: bore, height: size + 2);
    }

    rotate([0, 90, 0]) {
      cylinder(radius: bore, height: size + 2);
    }
  }
}
`;

const PRIMITIVES_SOURCE = `// The four primitives, side by side. Each is centered at its local
// origin, then placed with translate, rotate, and scale. Z is up.

camera {
  position: [160, -220, 140];
  lookAt: [0, 0, 0];
}

// sphere(radius)
translate([-45, 0, 0]) { sphere(20); }

// cube(size): the edge length
translate([0, 45, 0]) { rotate([0, 0, 30]) { cube(30); } }

// cylinder(radius, height): along its local Z axis, turned to lie along Y
translate([45, 0, 0]) { rotate([90, 0, 0]) { cylinder(radius: 15, height: 40); } }

// box([x, y, z]): full sizes along each axis, here scaled by 1.5
translate([0, -45, 0]) { scale(1.5) { box([30, 15, 10]); } }

// A warm color, a key light from above the front, and a dim fill from the right.
material { color: [0.9, 0.55, 0.3]; }
light { direction: [0.3, 0.6, -1]; intensity: 0.9; }
light { direction: [-1, 0.2, -0.3]; intensity: 0.35; }
`;

const BOOLEAN_OPERATIONS_SOURCE = `// The same cube and sphere, combined three ways. Z is up.

camera {
  position: [70, -150, 80];
  lookAt: [0, 0, 0];
}

// union: everything in either solid
translate([-50, 0, 0]) {
  union { cube(24); sphere(16); }
}

// intersection: only what every solid shares
intersection { cube(28); sphere(18); }

// difference: the first solid minus all the others
translate([50, 0, 0]) {
  difference { cube(28); sphere(18); }
}

// A cool color, a point light above and in front, and a dim fill.
material { color: [0.35, 0.6, 0.9]; }
light { position: [0, -70, 90]; }
light { direction: [1, 1, -0.5]; intensity: 0.3; }
`;

export const EXAMPLES = Object.freeze([
  Object.freeze({ id: 'bored-cube', title: 'Bored cube', fileName: 'bored-cube.csg', source: BORED_CUBE_SOURCE }),
  Object.freeze({ id: 'primitives', title: 'Primitives', fileName: 'primitives.csg', source: PRIMITIVES_SOURCE }),
  Object.freeze({ id: 'boolean-operations', title: 'Boolean operations', fileName: 'boolean-operations.csg', source: BOOLEAN_OPERATIONS_SOURCE }),
]);

// The source shown when nothing is saved (D10).
export const FIRST_LAUNCH_SOURCE = BORED_CUBE_SOURCE;
