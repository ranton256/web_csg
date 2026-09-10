// Walks the syntax tree: resolves names, evaluates expressions, binds primitive
// arguments, and validates the camera. Never throws for bad input: every
// semantic error becomes a diagnostic, and evaluation continues so that all of
// them are reported (DESIGN §8 Modeling language).
//
// Values are numbers or 3-element arrays. A value that already produced a
// diagnostic is represented as null, so one mistake does not cascade.

import { validateCamera } from './camera.js';

// Parameter order for positional arguments (DESIGN §5 primitive table).
const PARAMETERS = { sphere: ['radius'] };

class Scope {
  constructor(parent) {
    this.parent = parent;
    this.bindings = new Map();
  }

  isVisible(name) {
    return this.bindings.has(name) || (this.parent !== null && this.parent.isVisible(name));
  }

  lookup(name) {
    return this.bindings.has(name) ? this.bindings.get(name) : this.parent.lookup(name);
  }

  declare(name, value) {
    this.bindings.set(name, value);
  }
}

// Returns { diagnostics, scene }. scene is null whenever any diagnostic exists.
export function evaluate(program) {
  const diagnostics = [];
  const report = (loc, message) => diagnostics.push({ line: loc.line, column: loc.column, message });
  const scope = new Scope(null);
  const evaluateIn = (node) => evaluateExpression(node, scope, report);

  let cameraNode = null;
  let camera = null;
  const solids = [];

  for (const statement of program.statements) {
    switch (statement.type) {
      case 'Let': {
        // The name becomes visible only after its own value is evaluated.
        const value = evaluateIn(statement.value);
        if (scope.isVisible(statement.name)) {
          report(statement.nameLoc, `\`${statement.name}\` is already declared`);
        } else {
          scope.declare(statement.name, value);
        }
        break;
      }
      case 'Camera':
        if (cameraNode !== null) {
          report(statement.loc, 'exactly one camera block is required');
        } else {
          cameraNode = statement;
          camera = validateCamera(statement, evaluateIn, report);
        }
        break;
      case 'Call': {
        const solid = evaluateCall(statement, evaluateIn, report);
        if (solid !== null) solids.push(solid);
        break;
      }
      default:
        throw new Error(`unknown statement type ${statement.type}`);
    }
  }

  if (cameraNode === null) report({ line: 1, column: 1 }, 'exactly one camera block is required');

  diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);
  if (diagnostics.length > 0) return { diagnostics, scene: null };
  return { diagnostics, scene: { camera, solids } };
}

function evaluateExpression(node, scope, report) {
  switch (node.type) {
    case 'Number':
      return node.value;
    case 'Name':
      if (!scope.isVisible(node.name)) {
        report(node.loc, `\`${node.name}\` is undeclared`);
        return null;
      }
      return scope.lookup(node.name);
    case 'Vector': {
      const values = node.elements.map((element) => evaluateExpression(element, scope, report));
      let valid = true;
      node.elements.forEach((element, i) => {
        if (Array.isArray(values[i])) {
          report(element.loc, 'vector elements must be numbers');
          valid = false;
        } else if (values[i] === null) {
          valid = false;
        }
      });
      return valid ? values : null;
    }
    case 'Negate': {
      const value = evaluateExpression(node.operand, scope, report);
      if (value === null) return null;
      return Array.isArray(value) ? value.map((component) => -component) : -value;
    }
    default:
      throw new Error(`unknown expression type ${node.type}`);
  }
}

// Binds a primitive call's arguments to its parameters and validates them.
// Returns the solid, or null after reporting.
function evaluateCall(call, evaluateIn, report) {
  const parameters = PARAMETERS[call.callee];
  const given = new Map();
  let positional = 0;
  let valid = true;

  for (const arg of call.args) {
    const value = evaluateIn(arg.value);
    let name = arg.name;
    if (name === null) {
      if (positional >= parameters.length) {
        const count = parameters.length;
        report(arg.loc, `${call.callee} takes ${count} argument${count === 1 ? '' : 's'}`);
        valid = false;
        continue;
      }
      name = parameters[positional++];
    } else if (!parameters.includes(name)) {
      report(arg.loc, `unknown parameter \`${name}\` for ${call.callee}`);
      valid = false;
      continue;
    }
    if (given.has(name)) {
      report(arg.loc, `parameter \`${name}\` is given more than once`);
      valid = false;
      continue;
    }
    given.set(name, { value, loc: arg.loc });
  }

  for (const parameter of parameters) {
    if (!given.has(parameter)) {
      report(call.loc, `missing parameter \`${parameter}\` for ${call.callee}`);
      valid = false;
    }
  }
  if (!valid) return null;

  const radius = given.get('radius');
  if (radius.value === null) return null;
  if (typeof radius.value !== 'number') {
    report(radius.loc, 'the radius must be a number');
    return null;
  }
  if (!(radius.value > 0)) {
    report(radius.loc, 'the radius must be greater than 0');
    return null;
  }
  return { type: 'sphere', radius: radius.value, loc: call.loc };
}
