// Walks the syntax tree: resolves names, evaluates expressions, binds primitive
// and transform arguments, validates the camera, checks bodies, and composes
// transforms into each primitive's placement. Never throws for bad input:
// every semantic error becomes a diagnostic, and evaluation continues so that
// all of them are reported (DESIGN §8 Modeling language).
//
// Values are numbers or 3-element arrays. A value that already produced a
// diagnostic is represented as null, so one mistake does not cascade.

import { validateCamera } from './camera.js';
import { IDENTITY, compose, rotation, scaling, translation } from './transform.js';

// Parameters in positional order, with their kind (DESIGN §5 primitive table).
// Every dimension must be greater than 0.
const PRIMITIVES = {
  sphere: [{ name: 'radius', kind: 'number' }],
  cube: [{ name: 'size', kind: 'number' }],
  box: [{ name: 'size', kind: 'vector' }],
  cylinder: [{ name: 'radius', kind: 'number' }, { name: 'height', kind: 'number' }],
};

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
// scene.solids lists placed primitives: { type, <parameters>, placement, loc }.
export function evaluate(program) {
  const diagnostics = [];
  const report = (loc, message) => diagnostics.push({ line: loc.line, column: loc.column, message });
  const state = { cameraNode: null, camera: null, solids: [] };

  evaluateStatements(program.statements, new Scope(null), {
    topLevel: true, rendered: true, placement: IDENTITY, report, state,
  });
  if (state.cameraNode === null) report({ line: 1, column: 1 }, 'exactly one camera block is required');

  diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);
  if (diagnostics.length > 0) return { diagnostics, scene: null };
  return { diagnostics, scene: { camera: state.camera, solids: state.solids } };
}

// Evaluates a statement list in scope; returns how many solids it contains.
// context.placement is the composed placement of the enclosing transforms;
// context.rendered is false inside constructs that are not supported yet.
function evaluateStatements(statements, scope, context) {
  const { report } = context;
  const evaluateIn = (node) => evaluateExpression(node, scope, report);
  let solids = 0;

  for (const statement of statements) {
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
      case 'PropertyBlock':
        evaluatePropertyBlock(statement, evaluateIn, context);
        break;
      case 'Call': {
        solids++;
        const solid = evaluatePrimitive(statement, evaluateIn, report);
        if (solid !== null && context.rendered) context.state.solids.push({ ...solid, placement: context.placement });
        break;
      }
      case 'Transform': {
        solids++;
        // An invalid transform still has its body checked, in place.
        const placement = evaluateTransform(statement, evaluateIn, context);
        evaluateBody(statement, scope, { ...context, placement: placement ?? context.placement });
        break;
      }
      case 'Boolean':
        // Parsed now; semantics arrive in M4. Its contents are still checked.
        solids++;
        report(statement.loc, `\`${statement.keyword}\` is not supported yet`);
        evaluateBody(statement, scope, { ...context, rendered: false });
        break;
      default:
        throw new Error(`unknown statement type ${statement.type}`);
    }
  }
  return solids;
}

// A transform or Boolean body: its own scope, and at least one solid.
function evaluateBody(block, scope, context) {
  const solids = evaluateStatements(block.body, new Scope(scope), { ...context, topLevel: false });
  if (solids === 0) context.report(block.loc, `the \`${block.keyword}\` block contains no solids`);
}

function evaluatePropertyBlock(block, evaluateIn, context) {
  const { report, state } = context;
  if (block.keyword !== 'camera') {
    // light and material arrive in M5; their expressions are still checked.
    report(block.loc, `\`${block.keyword}\` is not supported yet`);
    for (const property of block.properties) evaluateIn(property.value);
    return;
  }
  // Every camera block is validated, so all of its errors are reported; only
  // the first top-level block is used.
  const camera = validateCamera(block, evaluateIn, report);
  if (!context.topLevel) {
    report(block.loc, 'the camera block must be at the top level');
  } else if (state.cameraNode !== null) {
    report(block.loc, 'exactly one camera block is required');
  } else {
    state.cameraNode = block;
    state.camera = camera;
  }
}

// translate(vector), rotate(vector), scale(number > 0): exactly one positional
// argument (DESIGN §12 D19). Returns the composed placement for the body, or
// null after reporting.
function evaluateTransform(block, evaluateIn, context) {
  const { report } = context;
  const values = block.args.map((arg) => evaluateIn(arg.value));
  if (block.args.length !== 1 || block.args[0].name !== null) {
    report(block.loc, `\`${block.keyword}\` takes exactly one positional argument`);
    return null;
  }
  const [value] = values;
  const { loc } = block.args[0];
  if (value === null) return null;

  switch (block.keyword) {
    case 'translate':
      if (!Array.isArray(value)) {
        report(loc, '`translate` needs a vector');
        return null;
      }
      return compose(context.placement, translation(value));
    case 'rotate':
      if (!Array.isArray(value)) {
        report(loc, '`rotate` needs a vector of angles in degrees');
        return null;
      }
      return compose(context.placement, rotation(value));
    case 'scale':
      if (typeof value !== 'number') {
        report(loc, 'the scale factor must be a number');
        return null;
      }
      if (!(value > 0)) {
        report(loc, 'the scale factor must be greater than 0');
        return null;
      }
      return compose(context.placement, scaling(value));
    default:
      throw new Error(`unknown transform ${block.keyword}`);
  }
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
    case 'Chain': {
      // Left-associative fold; every operand is evaluated so all errors show.
      let value = evaluateExpression(node.first, scope, report);
      for (const { op, operand, loc } of node.rest) {
        const right = evaluateExpression(operand, scope, report);
        value = applyOperator(op, value, right, loc, report);
      }
      return value;
    }
    default:
      throw new Error(`unknown expression type ${node.type}`);
  }
}

const kindOf = (value) => (Array.isArray(value) ? 'vector' : 'number');

// DESIGN §8 arithmetic: number∘number; vector ± vector; vector × number;
// number × vector; vector ÷ number. Anything else is an error at the operator.
function applyOperator(op, left, right, loc, report) {
  if (left === null || right === null) return null;
  const leftKind = kindOf(left);
  const rightKind = kindOf(right);
  const invalid = () => {
    report(loc, `invalid operands for \`${op}\`: ${leftKind} and ${rightKind}`);
    return null;
  };

  let result;
  switch (op) {
    case '+':
    case '-': {
      const combine = op === '+' ? (a, b) => a + b : (a, b) => a - b;
      if (leftKind === 'number' && rightKind === 'number') result = combine(left, right);
      else if (leftKind === 'vector' && rightKind === 'vector') result = left.map((c, i) => combine(c, right[i]));
      else return invalid();
      break;
    }
    case '*':
      if (leftKind === 'number' && rightKind === 'number') result = left * right;
      else if (leftKind === 'vector' && rightKind === 'number') result = left.map((c) => c * right);
      else if (leftKind === 'number' && rightKind === 'vector') result = right.map((c) => left * c);
      else return invalid();
      break;
    case '/':
      if (rightKind === 'vector') return invalid();
      if (right === 0) {
        report(loc, 'division by zero');
        return null;
      }
      result = leftKind === 'number' ? left / right : left.map((c) => c / right);
      break;
    default:
      throw new Error(`unknown operator ${op}`);
  }

  const finite = Array.isArray(result) ? result.every(Number.isFinite) : Number.isFinite(result);
  if (!finite) {
    report(loc, 'the result is too large');
    return null;
  }
  return result;
}

// Checks one dimension: a number > 0, or a vector whose components are > 0.
function checkDimension(parameter, value, loc, report) {
  if (value === null) return false;
  if (parameter.kind === 'number') {
    if (typeof value !== 'number') {
      report(loc, `the ${parameter.name} must be a number`);
      return false;
    }
    if (!(value > 0)) {
      report(loc, `the ${parameter.name} must be greater than 0`);
      return false;
    }
    return true;
  }
  if (!Array.isArray(value)) {
    report(loc, `the ${parameter.name} must be a vector`);
    return false;
  }
  if (!value.every((component) => component > 0)) {
    report(loc, `each ${parameter.name} component must be greater than 0`);
    return false;
  }
  return true;
}

// Binds a primitive call's arguments to its parameters and validates them.
// Returns { type, <parameters>, loc }, or null after reporting.
function evaluatePrimitive(call, evaluateIn, report) {
  const parameters = PRIMITIVES[call.callee];
  const names = parameters.map((parameter) => parameter.name);
  const given = new Map();
  let positional = 0;
  let valid = true;

  for (const arg of call.args) {
    const value = evaluateIn(arg.value);
    let name = arg.name;
    if (name === null) {
      if (positional >= names.length) {
        const count = names.length;
        report(arg.loc, `${call.callee} takes ${count} argument${count === 1 ? '' : 's'}`);
        valid = false;
        continue;
      }
      name = names[positional++];
    } else if (!names.includes(name)) {
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

  for (const name of names) {
    if (!given.has(name)) {
      report(call.loc, `missing parameter \`${name}\` for ${call.callee}`);
      valid = false;
    }
  }
  if (!valid) return null;

  for (const parameter of parameters) {
    const { value, loc } = given.get(parameter.name);
    if (!checkDimension(parameter, value, loc, report)) valid = false;
  }
  if (!valid) return null;

  const solid = { type: call.callee, loc: call.loc };
  for (const name of names) solid[name] = given.get(name).value;
  return solid;
}
