// cli.mjs — Kar-Canon on the command line. build.mjs bundles this with the KERNEL block of index.html into
// scripts/kar-canon.mjs, the single file the Agensi skill runs. It canonicalises two JSON documents, hashes
// each canonical form with SHA-256 and says whether they are the same data, and if not, exactly where not.
// Exit 0 = MATCH · 1 = DIFFER (or a self-check failed) · 2 = the input could not be used.
import { readFileSync } from 'node:fs';
import { ALGO_VERSION, compareDocs, runSelfTests } from './kernel.mjs';

const USAGE = `usage: node kar-canon.mjs <a.json> <b.json>     compare two JSON files (either may be - for stdin)
       node kar-canon.mjs <input.json | ->         input: {"a": <any JSON value>, "b": <any JSON value>}
       node kar-canon.mjs --selftest               run the page's built-in self-checks
output: a JSON report on stdout. exit 0 = MATCH, 1 = DIFFER, 2 = bad input`;

class InputError extends Error {}
const fail = (msg) => { throw new InputError(msg); };

function readText(path) {
  try { return readFileSync(path === '-' ? 0 : path, 'utf8'); }
  catch (e) { return fail(`cannot read ${path === '-' ? 'stdin' : path}: ${e.code || e.message}`); }
}
function checkJson(text, what) {
  try { JSON.parse(text); } catch (e) { fail(`${what} is not valid JSON (${e.message})`); }
  return text;
}

async function canon(textA, textB) {
  const r = await compareDocs(textA, textB);
  return {
    exitCode: r.match ? 0 : 1,
    report: {
      tool: 'kar-canon',
      algorithm: ALGO_VERSION,
      verdict: r.match ? 'MATCH' : 'DIFFER',
      a: { sha256: r.ha, canonical: r.ca },
      b: { sha256: r.hb, canonical: r.cb },
      diffs: r.diffs,
    },
  };
}

async function main(args) {
  if (args.length === 1 && args[0] === '--selftest') {
    const results = await runSelfTests();
    const passed = results.filter((t) => t.ok).length;
    process.stdout.write(JSON.stringify({ tool: 'kar-canon', algorithm: ALGO_VERSION, selftest: results, passed, total: results.length }, null, 2) + '\n');
    return passed === results.length ? 0 : 1;
  }
  let textA, textB;
  if (args.length === 2) {
    if (args[0] === '-' && args[1] === '-') fail('only one of the two documents can come from stdin');
    textA = checkJson(readText(args[0]), args[0] === '-' ? 'stdin' : args[0]);
    textB = checkJson(readText(args[1]), args[1] === '-' ? 'stdin' : args[1]);
  } else if (args.length === 1 && args[0] !== '-h' && args[0] !== '--help') {
    let input;
    try { input = JSON.parse(readText(args[0])); } catch (e) { if (e instanceof InputError) throw e; fail(`the input is not valid JSON (${e.message})`); }
    if (!input || typeof input !== 'object' || Array.isArray(input) || !('a' in input) || !('b' in input)) {
      fail('a single input must be an object with "a" and "b" (the two JSON values to compare)');
    }
    textA = JSON.stringify(input.a);
    textB = JSON.stringify(input.b);
  } else {
    process.stderr.write(USAGE + '\n');
    return 2;
  }
  const { exitCode, report } = await canon(textA, textB);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  return exitCode;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (e) {
  process.stderr.write(`kar-canon: ${e instanceof InputError ? e.message : 'internal error: ' + (e && e.message)}\n`);
  process.exitCode = e instanceof InputError ? 2 : 3;
}
