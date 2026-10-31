// kernel.test.mjs — Kar-Canon's kernel (the KERNEL block of index.html, generated into kernel.mjs).
// Expected values are worked out by hand from the documented algorithm; witness v0.6 checks every test bites.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALGO_VERSION, canonNumber, canonString, canonicalize, sha256Hex, typeOf, diffTrees, compareDocs, SELFTESTS, runSelfTests,
} from './kernel.mjs';

test('the algorithm name', () => assert.equal(ALGO_VERSION, 'kar-canon-v1'));

test('canonNumber: shortest round-trip form, -0 is 0, non-finite refused', () => {
  assert.equal(canonNumber(1.5), '1.5');
  assert.equal(canonNumber(100), '100');
  assert.equal(canonNumber(-0), '0');
  assert.equal(canonNumber(1e21), '1e+21');
  assert.throws(() => canonNumber(Infinity), /non-finite/);
  assert.throws(() => canonNumber(NaN), /non-finite/);
});

test('canonString: minimal JSON escaping', () => {
  assert.equal(canonString('café "q" \n'), '"café \\"q\\" \\n"');
});

test('canonicalize: every JSON type, keys sorted at every depth, arrays in order', () => {
  assert.equal(canonicalize(null), 'null');
  assert.equal(canonicalize(true), 'true');
  assert.equal(canonicalize(false), 'false');
  assert.equal(canonicalize(19.90), '19.9');
  assert.equal(canonicalize('x'), '"x"');
  assert.equal(canonicalize([3, 'a', null, [true]]), '[3,"a",null,[true]]');
  assert.equal(canonicalize({ b: 2, a: { d: [1, { z: 0, y: -0 }], c: 'é' } }), '{"a":{"c":"é","d":[1,{"y":0,"z":0}]},"b":2}');
  assert.equal(canonicalize({}), '{}');
  assert.equal(canonicalize([]), '[]');
});

test('canonicalize: values JSON cannot hold are refused, never silently dropped', () => {
  assert.throws(() => canonicalize(undefined), /unsupported JSON value type: undefined/);
  assert.throws(() => canonicalize(() => 1), /unsupported JSON value type: function/);
  assert.throws(() => canonicalize({ a: 10n }), /unsupported JSON value type: bigint/);
});

test('sha256Hex: the FIPS 180-2 test vector', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('typeOf: null and arrays are their own types', () => {
  assert.equal(typeOf(null), 'null');
  assert.equal(typeOf([]), 'array');
  assert.equal(typeOf({}), 'object');
  assert.equal(typeOf(1), 'number');
  assert.equal(typeOf('s'), 'string');
});

test('diffTrees: equal data has no differences', () => {
  assert.deepEqual(diffTrees({ a: [1, { b: 'x' }], c: null }, { c: null, a: [1, { b: 'x' }] }), []);
});

test('diffTrees: changed, added and removed keys, paths rooted at $ by default', () => {
  assert.deepEqual(diffTrees({ a: 1, b: 2, k: 'same' }, { a: 1, b: 3, c: 4, k: 'same' }), [
    { path: '$.b', kind: 'changed', from: 2, to: 3 },
    { path: '$.c', kind: 'added', to: 4 },
  ]);
  assert.deepEqual(diffTrees({ a: 1, gone: true }, { a: 1 }), [{ path: '$.gone', kind: 'removed', from: true }]);
  assert.deepEqual(diffTrees({ x: 1 }, { x: 2 }, 'root'), [{ path: 'root.x', kind: 'changed', from: 1, to: 2 }]);
});

test('diffTrees: a type change is reported once, at the node, not below it', () => {
  assert.deepEqual(diffTrees({ x: '1' }, { x: 1 }), [{ path: '$.x', kind: 'type-changed', from: '1', to: 1 }]);
  assert.deepEqual(diffTrees({ x: [1] }, { x: { 0: 1 } }), [{ path: '$.x', kind: 'type-changed', from: [1], to: { 0: 1 } }]);
  assert.deepEqual(diffTrees({ x: null }, { x: {} }), [{ path: '$.x', kind: 'type-changed', from: null, to: {} }]);
});

test('diffTrees: arrays compare position by position; extra items are added or removed', () => {
  assert.deepEqual(diffTrees([1, 2], [1, 2, 3, 4]), [
    { path: '$[2]', kind: 'added', to: 3 },
    { path: '$[3]', kind: 'added', to: 4 },
  ]);
  assert.deepEqual(diffTrees([1, 2, 3], [1]), [
    { path: '$[1]', kind: 'removed', from: 2 },
    { path: '$[2]', kind: 'removed', from: 3 },
  ]);
  assert.deepEqual(diffTrees(['a', 'b'], ['b', 'a']), [
    { path: '$[0]', kind: 'changed', from: 'a', to: 'b' },
    { path: '$[1]', kind: 'changed', from: 'b', to: 'a' },
  ]);
  assert.deepEqual(diffTrees({ t: [{ n: 1 }] }, { t: [{ n: 2 }] }), [{ path: '$.t[0].n', kind: 'changed', from: 1, to: 2 }]);
});

test('compareDocs: formatting, key order, number spelling and escapes do not matter; data does', async () => {
  const same = await compareDocs('{\n "b": 1.50, "a": "caf\\u00e9"\n}', '{"a":"café","b":1.5}');
  assert.equal(same.match, true);
  assert.equal(same.ca, '{"a":"café","b":1.5}');
  assert.equal(same.ha, same.hb);
  assert.equal(same.ha, await sha256Hex('{"a":"café","b":1.5}'));
  assert.deepEqual(same.diffs, []);
  const differ = await compareDocs('{"amount": 100}', '{"amount": 150}');
  assert.equal(differ.match, false);
  assert.notEqual(differ.ha, differ.hb);
  assert.deepEqual(differ.diffs, [{ path: '$.amount', kind: 'changed', from: 100, to: 150 }]);
  await assert.rejects(compareDocs('{', '{}'), SyntaxError);
});

test('SELFTESTS: the page ships ten self-checks and all of them pass', async () => {
  assert.equal(SELFTESTS.length, 10);
  const results = await runSelfTests();
  assert.equal(results.length, 10);
  for (const r of results) assert.deepEqual({ ok: r.ok, detail: r.detail }, { ok: true, detail: '' }, r.name);
});

test('runSelfTests: a wrong expectation fails with a reason; an unexpected path or an error fails too', async () => {
  const results = await runSelfTests([
    { name: 'right', a: '{"a":1}', b: '{"a":1}', expect: 'match' },
    { name: 'wrong verdict', a: '{"a":1}', b: '{"a":2}', expect: 'match' },
    { name: 'wrong verdict, path would match', a: '{"a":1}', b: '{"a":2}', expect: 'match', expectPath: '$.a' },
    { name: 'right verdict, right path', a: '{"a":1}', b: '{"a":2}', expect: 'differ', expectPath: '$.a' },
    { name: 'right verdict, wrong path', a: '{"a":1}', b: '{"a":2}', expect: 'differ', expectPath: '$.b' },
    { name: 'not JSON', a: '{', b: '{}', expect: 'match' },
  ]);
  assert.deepEqual(results.map((r) => [r.name, r.ok]), [
    ['right', true], ['wrong verdict', false], ['wrong verdict, path would match', false],
    ['right verdict, right path', true], ['right verdict, wrong path', false], ['not JSON', false],
  ]);
  assert.equal(results[1].detail, ' (expected match, got differ)');
  assert.equal(results[2].detail, ' (expected match at $.a, got differ)');
  assert.equal(results[4].detail, ' (expected differ at $.b, got differ)');
  assert.match(results[5].detail, /^ \(error: /);
});
