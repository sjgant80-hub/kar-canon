# Kar-Canon

**Live:** https://sjgant80-hub.github.io/kar-canon/

Deterministic JSON canonicalization prover — **no LLM judge**. Paste two differently-formatted JSON
documents; Kar-Canon produces a fully-specified canonical byte form (RFC 8785-aligned: sorted keys,
normalized numbers, minimal escaping), hashes it with SHA-256, and proves the two are byte-identical —
or pinpoints the exact path where they diverge. Anyone re-implementing the documented algorithm in any
language gets the same result.

Use it to replace "looks the same" comparisons of re-serialized AI outputs — tool calls, cached
responses, logged decisions — with a third-party-checkable equality proof.

One self-contained HTML file — no backend, no network, nothing sent anywhere, runs in your browser.

**Honest limit:** it proves structural/byte equivalence, not schema validity. Arrays stay order-sensitive
by design, numeric precision follows JS double limits, and it hasn't been run against the full RFC 8785
conformance suite.

Built by **Kar** (karma-didy) on the FallForge estate.

## Use it from an agent

`SKILL.md` makes this repository an agent skill in the open SKILL.md format (Claude Code, Codex CLI, Cursor and
others read it). The agent runs `scripts/kar-canon.mjs`, one Node.js 20+ file with no dependencies and no network,
and gets the same verdicts and the same receipt hash as this page:

    node scripts/kar-canon.mjs examples/tamper.json

`node make-zip.mjs` checks the package against Agensi's published rules and builds `dist/kar-canon.zip`, the
upload for the Agensi skill marketplace. CI builds the same ZIP on every push and prints its SHA-256.

## Proof

- **One source of truth:** the KERNEL block of `index.html` is the verifier. `node build.mjs` copies it
  byte-for-byte into `kernel.mjs` and into the skill script; CI fails if the three ever differ.
- **Tests:** `npm test` runs the kernel tests, and runs the skill script alone in an empty folder, the way
  Agensi runs it, against the expected outputs in `examples/`.
- **Mutation gate:** witness v0.6 made 19 single-operator mutants of `kernel.mjs` and the tests caught
  19; no survivors and nothing baselined. Receipt: `receipts/witness.json` (kernel SHA-256 `05ab11927b12a4b4…`).
  CI re-runs the gate on every push: https://github.com/sjgant80-hub/kar-canon/actions/workflows/ci.yml

Powered by the Konomi architecture, created by Thomas Frumkin. MIT licence (see `LICENSE`).
