# `src/codec` — Milesight IPSO payload codec

**Empty by design. Stage 0 does not implement this.**

This layer turns the byte buffers produced by `src/transport` into typed values
and back, following `docs/milesight-protocol-reference.md`: a flat sequence of
`(ID, TYPE, DATA)` triples, where `(ID, TYPE)` determines the data length.

Rules for this layer (per `CLAUDE.md`):

- Pure functions only. No NFC calls, no React, no I/O, no module-level state.
  Everything here should be unit-testable without hardware — this is the part
  most worth testing.
- It must not import from `src/transport` or `src/ui`.
- Parsing lives here, never inline in a component.

Filled in during **Stage 1/2** of `docs/roadmap.md`.

Open item that blocks the iDOL53 measurement decoder specifically: the ammonia
channel mapping is _not_ in the Milesight tables — it comes from dol-sensors'
own DOL53 interface spec. Do not guess it. See `CLAUDE.md`.
