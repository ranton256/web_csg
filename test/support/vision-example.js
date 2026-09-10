// The bored-cube example from vision.md, used by tests across milestones.
export const VISION_EXAMPLE = `// Coordinates use Z as up.
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
