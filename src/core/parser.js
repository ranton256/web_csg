// Recursive-descent parser for the M1 language subset. Produces a syntax tree
// whose nodes carry { line, column } locations, and throws SourceError at the
// first syntax error (DESIGN §8 Modeling language).
//
//   program    := statement*
//   statement  := 'let' NAME '=' expression ';'
//               | 'camera' '{' (NAME ':' expression ';')* '}'
//               | 'sphere' '(' arguments? ')' ';'
//   arguments  := argument (',' argument)*
//   argument   := NAME ':' expression | expression
//   expression := '-' expression | NUMBER | NAME | '[' expression ',' expression ',' expression ']'

import { SourceError } from './lexer.js';

// Reserved words whose constructs arrive in later milestones.
const NOT_YET_SUPPORTED = new Set([
  'cube', 'box', 'cylinder', 'translate', 'rotate', 'scale',
  'union', 'intersection', 'difference', 'light', 'material',
]);
const OPERATORS = new Set(['+', '-', '*', '/']);

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

  function statement() {
    const token = peek();
    if (token.type === 'keyword') {
      if (token.value === 'let') return letStatement();
      if (token.value === 'camera') return cameraBlock();
      if (token.value === 'sphere') return call();
      if (NOT_YET_SUPPORTED.has(token.value)) fail(token, `\`${token.value}\` is not supported yet`);
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

  function cameraBlock() {
    const start = next();
    expect('{');
    const properties = [];
    while (!isPunct(peek(), '}')) {
      const name = peek();
      if (name.type !== 'identifier') fail(name, `expected a camera property name or \`}\` but found ${describe(name)}`);
      next();
      expect(':');
      const value = expression();
      expect(';');
      properties.push({ name: name.value, value, loc: loc(name) });
    }
    next();
    return { type: 'Camera', properties, loc: loc(start) };
  }

  function call() {
    const callee = next();
    expect('(');
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
    expect(';');
    return { type: 'Call', callee: callee.value, args, loc: loc(callee) };
  }

  function expression() {
    const value = unary();
    const token = peek();
    if (token.type === 'punct' && OPERATORS.has(token.value)) {
      fail(token, `binary arithmetic (\`${token.value}\`) is not supported yet`);
    }
    return value;
  }

  function unary() {
    const token = peek();
    if (isPunct(token, '-')) {
      next();
      return { type: 'Negate', operand: unary(), loc: loc(token) };
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
    if (isPunct(token, '[')) return vector();
    if (isPunct(token, '(')) fail(token, 'parentheses are not supported yet');
    if (token.type === 'keyword') fail(token, `\`${token.value}\` is a reserved word and cannot be used in an expression`);
    fail(token, `expected an expression but found ${describe(token)}`);
  }

  function vector() {
    const open = next();
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
    return { type: 'Vector', elements, loc: loc(open) };
  }

  const statements = [];
  while (peek().type !== 'eof') statements.push(statement());
  return { type: 'Program', statements };
}
