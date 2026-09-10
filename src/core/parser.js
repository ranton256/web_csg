// Recursive-descent parser for the Web CSG language (DESIGN §8 Modeling
// language). Produces a syntax tree whose nodes carry { line, column }
// locations, and throws SourceError at the first syntax error.
//
//   statement  := 'let' NAME '=' expr ';'
//               | PROPERTY_BLOCK '{' (NAME ':' expr ';')* '}'    camera | light | material
//               | PRIMITIVE '(' arguments? ')' ';'                sphere | cube | box | cylinder
//               | TRANSFORM '(' arguments? ')' body              translate | rotate | scale
//               | BOOLEAN body                                    union | intersection | difference
//   body       := '{' statement* '}'
//   arguments  := argument (',' argument)*
//   argument   := NAME ':' expr | expr
//   expr       := term (('+' | '-') term)*
//   term       := unary (('*' | '/') unary)*
//   unary      := '-' unary | primary
//   primary    := NUMBER | NAME | '(' expr ')' | '[' expr ',' expr ',' expr ']'
//
// Operator chains become flat Chain nodes, so a long chain adds no recursion.
// Each unary minus, bracket, parenthesis, and body is a nesting level, and
// MAX_NESTING_DEPTH bounds recursion here and in the evaluator for any input.

import { MAX_NESTING_DEPTH } from './constants.js';
import { SourceError } from './lexer.js';

const PROPERTY_BLOCKS = new Set(['camera', 'light', 'material']);
const PRIMITIVES = new Set(['sphere', 'cube', 'box', 'cylinder']);
const TRANSFORMS = new Set(['translate', 'rotate', 'scale']);
const BOOLEANS = new Set(['union', 'intersection', 'difference']);

export function parse(tokens) {
  let pos = 0;

  const peek = (offset = 0) => tokens[Math.min(pos + offset, tokens.length - 1)];
  const next = () => tokens[pos < tokens.length - 1 ? pos++ : pos];
  const loc = (token) => ({ line: token.line, column: token.column });
  const fail = (token, message) => {
    throw new SourceError(message, token.line, token.column);
  };
  const isPunct = (token, value) => token.type === 'punct' && token.value === value;
  const describe = (token) => {
    if (token.type === 'eof') return 'the end of the source';
    if (token.type === 'number') return `number ${token.text}`;
    return `\`${token.value}\``;
  };
  const expect = (value) => {
    const token = peek();
    if (!isPunct(token, value)) fail(token, `expected \`${value}\` but found ${describe(token)}`);
    return next();
  };

  let depth = 0;
  const enter = (token, what) => {
    depth++;
    if (depth > MAX_NESTING_DEPTH) fail(token, `${what} are nested too deeply (more than ${MAX_NESTING_DEPTH} levels)`);
  };
  const leave = () => {
    depth--;
  };

  function statement() {
    const token = peek();
    if (token.type === 'keyword') {
      const keyword = token.value;
      if (keyword === 'let') return letStatement();
      if (PROPERTY_BLOCKS.has(keyword)) return propertyBlock();
      if (PRIMITIVES.has(keyword)) return call();
      if (TRANSFORMS.has(keyword)) return transform();
      if (BOOLEANS.has(keyword)) return boolean();
    }
    fail(token, `expected a statement but found ${describe(token)}`);
  }

  function letStatement() {
    const start = next();
    const name = peek();
    if (name.type === 'keyword') fail(name, `\`${name.value}\` is a reserved word and cannot be used as a name`);
    if (name.type !== 'identifier') fail(name, `expected a name after \`let\` but found ${describe(name)}`);
    next();
    expect('=');
    const value = expression();
    expect(';');
    return { type: 'Let', name: name.value, nameLoc: loc(name), value, loc: loc(start) };
  }

  function propertyBlock() {
    const keyword = next();
    expect('{');
    const properties = [];
    while (!isPunct(peek(), '}')) {
      const name = peek();
      if (name.type !== 'identifier') fail(name, `expected a ${keyword.value} property name or \`}\` but found ${describe(name)}`);
      next();
      expect(':');
      const value = expression();
      expect(';');
      properties.push({ name: name.value, value, loc: loc(name) });
    }
    next();
    return { type: 'PropertyBlock', keyword: keyword.value, properties, loc: loc(keyword) };
  }

  // The parentheses around arguments are a nesting level (DESIGN §5, D18).
  function argumentList() {
    enter(expect('('), 'expressions');
    const args = [];
    let sawNamed = false;
    if (!isPunct(peek(), ')')) {
      for (;;) {
        const token = peek();
        if (token.type === 'identifier' && isPunct(peek(1), ':')) {
          next();
          next();
          args.push({ name: token.value, value: expression(), loc: loc(token) });
          sawNamed = true;
        } else {
          if (sawNamed) fail(token, 'positional arguments must come before named arguments');
          args.push({ name: null, value: expression(), loc: loc(token) });
        }
        if (!isPunct(peek(), ',')) break;
        next();
      }
    }
    expect(')');
    leave();
    return args;
  }

  function call() {
    const callee = next();
    const args = argumentList();
    expect(';');
    return { type: 'Call', callee: callee.value, args, loc: loc(callee) };
  }

  function transform() {
    const keyword = next();
    const args = argumentList();
    const statements = body(keyword);
    return { type: 'Transform', keyword: keyword.value, args, body: statements, loc: loc(keyword) };
  }

  function boolean() {
    const keyword = next();
    const statements = body(keyword);
    return { type: 'Boolean', keyword: keyword.value, body: statements, loc: loc(keyword) };
  }

  // A braced body; the block's keyword token marks its nesting level.
  function body(keyword) {
    enter(keyword, 'blocks');
    expect('{');
    const statements = [];
    while (!isPunct(peek(), '}')) {
      if (peek().type === 'eof') fail(peek(), 'expected `}` but found the end of the source');
      statements.push(statement());
    }
    next();
    leave();
    return statements;
  }

  // A chain of left-associative operators at one precedence level.
  function chain(operand, operators) {
    const first = operand();
    const rest = [];
    while (peek().type === 'punct' && operators.includes(peek().value)) {
      const op = next();
      rest.push({ op: op.value, operand: operand(), loc: loc(op) });
    }
    return rest.length === 0 ? first : { type: 'Chain', first, rest, loc: first.loc };
  }

  function expression() {
    return chain(term, ['+', '-']);
  }

  function term() {
    return chain(unary, ['*', '/']);
  }

  function unary() {
    const token = peek();
    if (isPunct(token, '-')) {
      next();
      enter(token, 'expressions');
      const operand = unary();
      leave();
      return { type: 'Negate', operand, loc: loc(token) };
    }
    return primary();
  }

  function primary() {
    const token = peek();
    if (token.type === 'number') {
      next();
      return { type: 'Number', value: token.value, loc: loc(token) };
    }
    if (token.type === 'identifier') {
      next();
      return { type: 'Name', name: token.value, loc: loc(token) };
    }
    if (isPunct(token, '(')) {
      next();
      enter(token, 'expressions');
      const inner = expression();
      expect(')');
      leave();
      return inner;
    }
    if (isPunct(token, '[')) return vector();
    if (token.type === 'keyword') fail(token, `\`${token.value}\` is a reserved word and cannot be used in an expression`);
    fail(token, `expected an expression but found ${describe(token)}`);
  }

  function vector() {
    const open = next();
    enter(open, 'expressions');
    const elements = [expression()];
    while (elements.length < 3) {
      const token = peek();
      if (!isPunct(token, ',')) fail(token, `a vector needs exactly three elements; expected \`,\` but found ${describe(token)}`);
      next();
      elements.push(expression());
    }
    const close = peek();
    if (!isPunct(close, ']')) fail(close, `a vector needs exactly three elements; expected \`]\` but found ${describe(close)}`);
    next();
    leave();
    return { type: 'Vector', elements, loc: loc(open) };
  }

  const statements = [];
  while (peek().type !== 'eof') statements.push(statement());
  return { type: 'Program', statements };
}
