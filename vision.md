# Web CSG 

Web CSG is a small constructive solid modeler that runs directly in your browser using ThreeJS.

A small number of primitives are supported:
- sphere
- cube
- bounded cylinder

CSG shapes are created out of simpler primitives using transformations and boolean operations.

## Overview of Features

basic features include
- A source editor with line-and-column error messages.
- Boxes, cylinders, groups, arithmetic
- Save/load of the source and a few built-in examples.
- A clear “preview shows the last valid model” indicator when the source contains an error.
- Resizeable preview panel in UI showing the rendered scene, or last good version if there are errors.

Each primitive carries a local coordinate space and a transformation matrix that transforms that to world coordinates.
Transformations include:

Transformations include:
* Uniform Scaling
* Rotations
* Translations

Boolean operations include:
* union
* intersection
* difference (subtraction)

Objects form a hierarchy so that they are joined using a boolean operation into a parent object so that they create a tree.

The camera uses proper 3d perspective and a realistic view, and materials have basic surface material properties suitable to a Blinn-Phone shading model.

The scene and camera position are set by describing them using a small domain specific language for modeling.

Rendering will be done with analytic ray-tracing.

This extends easily to supporting the boolean operations.

For example, imagine you have a box and a cylinder, and you know the portions of the ray being cast inside each of them.

| Solid or operation | Portions of the ray inside it |
| ------------------ | ----------------------------- |
| Box                | `[2, 8]`                      |
| Cylinder           | `[4, 6]`                      |
| Box ∪ cylinder     | `[2, 8]`                      |
| Box ∩ cylinder     | `[4, 6]`                      |
| Box − cylinder     | `[2, 4]` and `[6, 8]`         |


To keep the math and code simple, we will do the ray tracing in pure JavaScript without the benefit of WebGL or any frameworks. This removes the need to deal with shader languages, like GLSL or how to handle accelerating ray tracing with a GPU.

## Modeling Language

Concepts the language needs to support are:

| Category           | Initial support                                        |
| ------------------ | ------------------------------------------------------ |
| Primitives         | `cube`, rectangular `box`, `sphere`, capped `cylinder` |
| Boolean operations | `union`, `intersection`, `difference`                  |
| Transforms         | `translate`, `rotate`, uniform `scale`                 |
| Expressions        | Numbers, vectors, names, parentheses, `+ - * /`        |
| Structure          | Nested blocks, immutable `let` bindings, comments      |
| Presentation       | One model color initially                              |

No loops, user-defined functions, imports, or arbitrary JavaScript execution are needed. 

The structure of the language should be concise and follow the scene hierarchy.

The language must also define the (default) camera and viewport so that we can postpone interactive controls of
viewport until a later, optional feature.
The camera is defined as position, lookAt, up (direction vector), and fov (field of view).

- Exactly one camera block is required, at the top level.
- position and lookAt are required.
- up defaults to [0, 0, 1]; fov defaults to 45.
- Camera expressions can reference previously declared numeric values.
- position and lookAt must differ.
- up must be nonzero and must not be parallel to the viewing direction.
- fov must be strictly between 0 and 180 degrees.
- The output canvas determines the aspect ratio; resizing preserves the vertical field of view.

Here is an example of what it could look like.
```
// Coordinates use Z as up.
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
```

## Core Components

- JavaScript parser: source text → syntax tree with source locations.
- Validator/evaluator: resolve names and arithmetic, check dimensions and operation arguments.
- CSG representation: a small tree of primitives, transforms, and Boolean nodes.
- Renderer: render a fullscreen surface by casting a ray for each pixel.
- Editor interface: diagnostics, live rebuilding, camera controls, and save/load.

## Considerations and Edge Cases

There are several concerns and edge cases we must handle correctly, including;

- Preserve surface information. Every boundary must retain its originating primitive and normal so the result can be shaded.
- Handle subtraction normals. A cutter’s surface becomes an interior wall, so its normal must be reversed where it forms the difference boundary.
- Define coincident events. Identical shapes and touching surfaces need consistent rules; difference(A, A) should produce an empty solid.
- Handle rays starting inside solids. The visible hit may be an exit boundary.
- Keep transformed intersections comparable. Transform rays into primitive-local coordinates while preserving their common ray parameter.
- Specify numerical tolerance. Tangencies, nearly coincident surfaces, and tiny gaps should have deliberate behavior.


## Questions and Answers


### Answered

| Question                                           | A sensible initial rule                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Are dimensions radii, half-extents, or full sizes? | Cube/box dimensions are full sizes; sphere/cylinder explicitly use radius.                  |
| Where are primitives positioned?                   | Centered at the origin; cylinder axis is Z.                                                 |
| What does a multi-child difference mean?           | First child minus the union of all remaining children.                                      |
| What order are transforms applied?                 | Nested blocks compose from the inside outward; rotation vector order is explicitly defined. |
| What scaling is allowed?                           | Positive uniform scaling initially.                                                         |
| What happens after an invalid edit?                | Keep the last valid rendering and visibly mark it as stale.                                 |
| How much detail can the renderer resolve?          | Define supported scene scale, hit tolerance, and marching limits.                           |




## Later, optional improvements

- non-uniform Scaling is not necessarily uniform along dimensions. This allows creating ellipsoids from circles and general rectangular prisms from cubes.
- WebGL or ThreeJS support to accelerate rendering
- Cone and torus primitives
- A live 3D viewport with orbit, zoom, grid, axes, and standard views.
- Mouse picking: Click-to-select parts, with their dimensions and corresponding source highlighted.
- Orthographic camera option
- More control over surface materials instead of just color.

