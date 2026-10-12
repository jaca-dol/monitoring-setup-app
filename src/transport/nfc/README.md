# `src/transport/nfc` — NFC transport layer

**Empty by design. Stage 0 does not implement this.**

This layer owns _raw bytes over NFC and nothing else_: session start/stop, tag
discovery, chunked `transceive`, retries, ACK handling, platform differences
(iOS session restarts vs. Android tech dispatch).

Rules for this layer (per `CLAUDE.md`):

- It must not know what the bytes mean. No IPSO channel IDs, no device models,
  no units. That is `src/codec`'s job.
- It must not import from `src/ui`.
- Its public surface should be small and byte-oriented, roughly:
  `read(): Promise<Uint8Array>` / `write(bytes): Promise<void>` plus session
  lifecycle and capability checks.

Filled in during **Stage 1** of `docs/roadmap.md`, and Stage 1 is gated on
proving raw transceive against a real iDOL53 and a real Milesight device.
Do not build on top of this layer before that gate passes.

See also: `sdk/` already contains a working NFC transport (`toolbox-sdk`'s
`service/nfc`). Decide whether Stage 1 adopts it or writes its own before
adding files here.
