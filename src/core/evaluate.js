// Walks the syntax tree: resolves names, evaluates expressions, binds primitive
// arguments, validates the camera, and checks bodies. Never throws for bad
// input: every semantic error becomes a diagnostic, and evaluation continues
// so that all of them are reported (DESIGN §8 Modeling language).
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
  const state = { cameraNode: null, camera: null, solids: [] };

  evaluateStatements(program.statements, new Scope(null), { topLevel: true, report, state });
  if (state.cameraNode === null) report({ line: 1, column: 1 }, 'exactly one camera block is required');

  diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);
  if (diagnostics.length > 0) return { diagnostics, scene: null };
  return { diagnostics, scene: { camera: state.camera, solids: state.solids } };
}

// Evaluates a statement list in scope; returns how many solids it contains.
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
      case 'Call':
        solids++;
        evaluateCall(statement, evaluateIn, context);
        break;
      case 'Transform':
        // Parsed now; semantics arrive in M3. Its contents are still checked.
        solids++;
        report(statement.loc, `\`${statement.keyword}\` is not supported yet`);
        for (const arg of statement.args) evaluateIn(arg.value);
        evaluateBody(statement, scope, context);
        break;
      case 'Boolean':
        // Parsed now; semantics arrive in M4. Its contents are still checked.
        solids++;
        report(statement.loc, `\`${statement.keyword}\` is not supported yet`);
        evaluateBody(statement, scope, context);
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

function evaluateCall(call, evaluateIn, context) {
  if (call.callee !== 'sphere') {
    // cube, box, and cylinder arrive in M3; their arguments are still checked.
    context.report(call.loc, `\`${call.callee}\` is not supported yet`);
    for (const arg of call.args) evaluateIn(arg.value);
    return;
  }
  const solid = evaluateSphere(call, evaluateIn, context.report);
  // A sphere inside an unsupported block is checked but cannot be rendered.
  if (solid !== null && context.topLevel) context.state.solids.push(solid);
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

// Binds a sphere call's arguments to its parameters and validates them.
// Returns the solid, or null after reporting.
function evaluateSphere(call, evaluateIn, report) {
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
