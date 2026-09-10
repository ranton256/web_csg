import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { DEFAULT_PORT, REPO_ROOT, parsePort, startServer } from '../tools/serve.mjs';

const SECRET = 'TOP SECRET OUTSIDE ROOT';

// Sends the request target exactly as given (no client-side normalization).
function request(port, target, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: target, method }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

describe('dev server on a fixture root', () => {
  let tmp;
  let server;
  let port;

  before(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-csg-serve-'));
    const root = path.join(tmp, 'root');
    fs.mkdirSync(path.join(root, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'secret.txt'), SECRET);
    const files = {
      'index.html': '<title>fixture</title>',
      'a.js': 'export {};',
      'b.mjs': 'export {};',
      'c.css': 'body {}',
      'd.json': '{}',
      'e.png': 'png',
      'f.csg': 'sphere(1);',
      'g.txt': 'text',
      'h.md': '# md',
      'i.xyz': 'unknown',
      'sub/inner.txt': 'inner',
    };
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(root, name), content);
    }
    fs.symlinkSync(path.join(tmp, 'secret.txt'), path.join(root, 'link.txt'));
    server = await startServer({ port: 0, root });
    port = server.address().port;
  });

  after(() => {
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('listens on the loopback interface only', () => {
    assert.equal(server.address().address, '127.0.0.1');
  });

  test('/ serves index.html', async () => {
    const res = await request(port, '/');
    assert.equal(res.status, 200);
    assert.equal(res.body, '<title>fixture</title>');
    assert.equal(res.headers['content-type'], 'text/html; charset=utf-8');
  });

  test('content types follow the extension table', async () => {
    const expected = {
      '/a.js': 'text/javascript; charset=utf-8',
      '/b.mjs': 'text/javascript; charset=utf-8',
      '/c.css': 'text/css; charset=utf-8',
      '/d.json': 'application/json; charset=utf-8',
      '/e.png': 'image/png',
      '/f.csg': 'text/plain; charset=utf-8',
      '/g.txt': 'text/plain; charset=utf-8',
      '/h.md': 'text/plain; charset=utf-8',
      '/i.xyz': 'application/octet-stream',
    };
    for (const [target, type] of Object.entries(expected)) {
      const res = await request(port, target);
      assert.equal(res.status, 200, target);
      assert.equal(res.headers['content-type'], type, target);
    }
  });

  test('responses are not cached', async () => {
    const res = await request(port, '/a.js');
    assert.equal(res.headers['cache-control'], 'no-store');
  });

  test('traversal outside the root is refused', async () => {
    const attempts = [
      '/../secret.txt',
      '/%2e%2e/secret.txt',
      '/%2E%2E/%2E%2E/etc/passwd',
      '/sub/../../secret.txt',
      '/..%2fsecret.txt',
      '/sub/%2e%2e/%2e%2e/secret.txt',
      '/link.txt',
    ];
    for (const target of attempts) {
      const res = await request(port, target);
      assert.ok([403, 404].includes(res.status), `${target} returned ${res.status}`);
      assert.ok(!res.body.includes(SECRET), `${target} leaked the file`);
    }
  });

  test('directories other than / are not listed', async () => {
    assert.equal((await request(port, '/sub/')).status, 404);
    assert.equal((await request(port, '/sub')).status, 404);
  });

  test('missing files are 404', async () => {
    assert.equal((await request(port, '/does-not-exist.js')).status, 404);
  });

  test('unsupported methods are 405', async () => {
    const res = await request(port, '/', 'POST');
    assert.equal(res.status, 405);
    assert.equal(res.headers.allow, 'GET, HEAD');
  });

  test('HEAD matches GET without a body', async () => {
    const get = await request(port, '/a.js');
    const head = await request(port, '/a.js', 'HEAD');
    assert.equal(head.status, get.status);
    assert.equal(head.headers['content-type'], get.headers['content-type']);
    assert.equal(head.headers['content-length'], get.headers['content-length']);
    assert.equal(head.body, '');
  });
});

describe('dev server on the repository root', () => {
  test('/ serves the repository index.html', async () => {
    const server = await startServer({ port: 0 });
    try {
      const res = await request(server.address().port, '/');
      assert.equal(res.status, 200);
      assert.equal(res.body, fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8'));
    } finally {
      server.close();
    }
  });
});

describe('port selection', () => {
  test('--port wins over PORT, which wins over the default', () => {
    assert.equal(parsePort(['--port', '4173'], { PORT: '9000' }), 4173);
    assert.equal(parsePort([], { PORT: '9000' }), 9000);
    assert.equal(parsePort([], {}), DEFAULT_PORT);
    assert.equal(DEFAULT_PORT, 8080);
  });

  test('--port=<n> is accepted', () => {
    assert.equal(parsePort(['--port=4173'], { PORT: '9000' }), 4173);
  });

  test('invalid ports are rejected', () => {
    assert.throws(() => parsePort(['--port', 'abc'], {}), /Invalid port/);
    assert.throws(() => parsePort(['--port', '70000'], {}), /Invalid port/);
  });

  test('only plain decimal digits are ports', () => {
    for (const raw of [' ', ' 80', '1e3', '0x1F90', '+80', '-1', '80.0', '8o']) {
      assert.throws(() => parsePort(['--port', raw], {}), /Invalid port/, `--port ${JSON.stringify(raw)}`);
      assert.throws(() => parsePort([], { PORT: raw }), /Invalid port/, `PORT=${JSON.stringify(raw)}`);
    }
    assert.equal(parsePort(['--port', '0'], {}), 0);
    assert.equal(parsePort(['--port', '65535'], {}), 65535);
    assert.equal(parsePort(['--port', '000080'], {}), 80);
    assert.throws(() => parsePort(['--port', '65536'], {}), /Invalid port/);
  });

  test('--port without a value is rejected, not defaulted', () => {
    for (const argv of [['--port'], ['--port', ''], ['--port=']]) {
      assert.throws(() => parsePort(argv, {}), /--port requires a value/, JSON.stringify(argv));
    }
  });

  test('the CLI exits non-zero on a missing or invalid port', () => {
    for (const args of [['--port'], ['--port', 'abc'], ['--port', ' ']]) {
      const result = spawnSync(process.execPath, [path.join(REPO_ROOT, 'tools', 'serve.mjs'), ...args], {
        encoding: 'utf8',
        timeout: 5000,
      });
      assert.equal(result.status, 1, JSON.stringify(args));
      assert.match(result.stderr, /serve: (--port requires a value|Invalid port)/);
    }
  });

  test('the CLI listens on the --port it is given', async () => {
    const port = await freePort();
    const child = spawn(process.execPath, [path.join(REPO_ROOT, 'tools', 'serve.mjs'), '--port', String(port)]);
    try {
      await new Promise((resolve, reject) => {
        child.stdout.on('data', (chunk) => {
          if (chunk.toString().includes('Serving')) resolve();
        });
        child.once('exit', (code) => reject(new Error(`serve.mjs exited with ${code}`)));
      });
      const res = await request(port, '/');
      assert.equal(res.status, 200);
    } finally {
      child.kill();
    }
  });
});
