---
name: "kar-canon"
description: "Proves whether two JSON documents carry exactly the same data, whatever their formatting, key order, number spelling or escapes, by hashing an RFC 8785-aligned canonical form with SHA-256, and pinpoints every path where they differ when they do not. Use when the user asks whether two JSON files, API responses, tool-call arguments, cached outputs or config snapshots are the same, or to diff two JSON documents by data rather than by text. Deterministic Node.js script with no LLM judge and no network."
summary: "Same data or not? Canonicalise two JSON documents (sorted keys, normalised numbers, minimal escaping), compare their SHA-256, and list every changed, added, removed or retyped path. No LLM judge, no network, one Node.js file, mutation-tested."
version: "1.0.0"
tags: ["json", "canonicalization", "diff", "hashing", "deterministic", "receipts"]
use_cases: ["Prove a re-serialised tool call or API response is the same data as the original", "Find the one changed field between two large JSON payloads", "Give a reviewer a hash they can recompute to confirm two logged decisions match"]
docs_url: "https://sjgant80-hub.github.io/kar-canon/"
---

# Kar-Canon: same JSON data, or not?

Two JSON documents can look different and carry the same data (key order, whitespace, `1.50` against
`1.5`, `é` against `é`), or look alike and differ in one value. Kar-Canon settles it without a model:
it parses both, writes each in one fully specified canonical form, hashes that with SHA-256 and compares.

The canonical form (aligned with RFC 8785, the JSON Canonicalization Scheme):

- object keys sorted by code unit, at every depth; arrays keep their order (order is data);
- numbers in their shortest round-trip form (`1.50` → `1.5`, `1e2` → `100`, `-0` → `0`);
- strings with minimal escaping; no whitespace anywhere;
- duplicate keys resolve last-value-wins, as `JSON.parse` does.

| Verdict | Meaning |
|---|---|
| `MATCH` | The canonical forms are identical, so the two SHA-256 hashes are equal: the same data. |
| `DIFFER` | Not the same data. `diffs` lists each difference: `changed`, `added`, `removed` or `type-changed`, with its JSON path (`$.items[2].price`) and the values on each side. |

## When to use it

- The user asks whether two JSON files, responses, payloads or snapshots are "the same".
- You re-serialised or round-tripped JSON (a tool call, a cached response, a config) and need to prove nothing changed.
- You need a field-level diff of two JSON documents instead of a text diff full of formatting noise.

## How to run it

The script is `scripts/kar-canon.mjs`: one file, Node.js 20 or newer, no dependencies, no network, and it
writes no files. Run it unchanged and keep the `.mjs` extension.

1. Compare two files: `node scripts/kar-canon.mjs a.json b.json` (either path can be `-` for stdin).
2. Or pass both values in one JSON input, from a file or stdin:

   ```json
   { "a": { "action": "refund", "amount": 100 }, "b": { "amount": 150, "action": "refund" } }
   ```

   `node scripts/kar-canon.mjs input.json` or `node scripts/kar-canon.mjs -`.
3. Read the exit code: `0` MATCH, `1` DIFFER, `2` the input could not be used (for example a file that is not
   valid JSON; the reason is on stderr).
4. Report the verdict and both SHA-256 hashes. For DIFFER, list each entry of `diffs` as path, kind, from and to.
   Never call two documents the same when the verdict is DIFFER, however small the difference.

## What it prints

`examples/tamper.json` compares two refund approvals where only the amount changed. The report
(`examples/tamper.out.json`, exit code 1):

```json
{
  "tool": "kar-canon",
  "algorithm": "kar-canon-v1",
  "verdict": "DIFFER",
  "a": { "sha256": "5fde1795f9bf67e9b43f289c12add961541d7e51ea5703b4c227b675d81dc156",
         "canonical": "{\"action\":\"refund\",\"amount\":100,\"approved\":true,\"currency\":\"USD\"}" },
  "b": { "sha256": "337ead64b4fc735ee3c3c99ccca1536bc7f93a965e500f440dc3d8bc312e926c",
         "canonical": "{\"action\":\"refund\",\"amount\":150,\"approved\":true,\"currency\":\"USD\"}" },
  "diffs": [ { "path": "$.amount", "kind": "changed", "from": 100, "to": 150 } ]
}
```

`examples/match.json` is the same order written two ways (keys reordered, `19.90` against `19.9`): MATCH, exit 0.

## Re-check this skill yourself

Everything here is deterministic: the same input gives the same canonical form and the same hash on any
machine, and no language model judges anything.

- **A hash:** take the `canonical` string from the report and hash it with any SHA-256 tool; you get the
  report's `sha256`. Anyone can re-implement the canonical form above in another language and get the same bytes.
- **The self-checks:** `node scripts/kar-canon.mjs --selftest` runs the ten self-checks the live page runs
  on load (key order, number spelling, escapes, `-0`, duplicate keys, a tampered value, array order, an
  added key, a type change) and exits 0 only if all ten pass.
- **The examples:** `node scripts/kar-canon.mjs examples/tamper.json` prints exactly the report in
  `examples/tamper.out.json`.
- **The page:** https://sjgant80-hub.github.io/kar-canon/ runs the same logic in a browser; its "Tampered
  value" example shows the same two hashes.
- **The source:** https://github.com/sjgant80-hub/kar-canon (MIT). The script's KERNEL block is
  byte-identical to the logic of the live page and to `kernel.mjs`; CI fails if they ever differ.
- **CI on every push:** https://github.com/sjgant80-hub/kar-canon/actions/workflows/ci.yml runs the tests,
  the byte-identity check, the receipt check, the witness mutation gate and the ZIP build, and prints the
  ZIP's SHA-256.
- **The mutation gate:** witness v0.6 (https://github.com/sjgant80-hub/witness, tag `v0.6`) made
  19 single-operator changes (mutants) to the kernel and the tests caught 19 of them. None was baselined. The receipt is
  `receipts/witness.json` in the repository, for kernel SHA-256 `05ab11927b12a4b487185d64fb570a584a16ee32fcded079710014b10180674d`. With the repository and
  witness v0.6 side by side, `node gate.mjs --witness ../witness/witness.mjs` re-runs it.

## Where it stops

- It proves the two documents hold the same data. It does not check either against a schema (kar-conform does).
- Arrays are order-sensitive by design: `["a","b"]` and `["b","a"]` DIFFER.
- Numbers follow JavaScript's double precision: integers beyond 2^53 and decimals with more than about 17
  significant digits are compared after rounding to the nearest double.
- It has not been run against the full RFC 8785 conformance suite.

---

Made by AI Native Solutions, built by Kar. Powered by the Konomi architecture, created by Thomas Frumkin.
MIT licence: see `LICENSE`.
