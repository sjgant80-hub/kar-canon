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
