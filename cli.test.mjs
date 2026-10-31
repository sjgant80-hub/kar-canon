// cli.test.mjs — the two-file mode of the shipped script (the one-input mode and --selftest are in skill.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function inTemp(files, args, input) {
  const dir = mkdtempSync(join(tmpdir(), 'kar-canon-'));
  try {
    copyFileSync(resolve('scripts/kar-canon.mjs'), join(dir, 'kar-canon.mjs'));
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    return spawnSync(process.execPath, ['kar-canon.mjs', ...args], { cwd: dir, encoding: 'utf8', input, env });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const A = '{\n  "order_id": "A-1042",\n  "total": 19.90,\n  "items": ["quill", "ink"]\n}\n';
const B = '{"items":["quill","ink"],"order_id":"A-1042","total":19.9}';

test('two files with the same data in different formatting → MATCH, exit 0, equal hashes', () => {
  const r = inTemp({ 'a.json': A, 'b.json': B }, ['a.json', 'b.json']);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.verdict, 'MATCH');
  assert.equal(out.a.sha256, out.b.sha256);
  assert.equal(out.a.canonical, '{"items":["quill","ink"],"order_id":"A-1042","total":19.9}');
  assert.deepEqual(out.diffs, []);
});

test('one document from stdin, one from a file', () => {
  const r = inTemp({ 'b.json': B.replace('19.9', '20') }, ['-', 'b.json'], A);
  assert.equal(r.status, 1);
  assert.deepEqual(JSON.parse(r.stdout).diffs, [{ path: '$.total', kind: 'changed', from: 19.9, to: 20 }]);
});

test('duplicate keys resolve last-value-wins, as JSON.parse does', () => {
  const r = inTemp({ 'a.json': '{"x":1,"x":2}', 'b.json': '{"x":2}' }, ['a.json', 'b.json']);
  assert.equal(r.status, 0);
});

test('a file that is not JSON, or both documents on stdin → exit 2 with the reason', () => {
  const bad = inTemp({ 'a.json': A, 'b.json': '{ nope' }, ['a.json', 'b.json']);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /b\.json is not valid JSON/);
  const both = inTemp({}, ['-', '-'], A);
  assert.equal(both.status, 2);
  assert.match(both.stderr, /only one/);
  const shape = inTemp({ 'i.json': '{"a": 1}' }, ['i.json']);
  assert.equal(shape.status, 2);
  assert.match(shape.stderr, /"a" and "b"/);
});
