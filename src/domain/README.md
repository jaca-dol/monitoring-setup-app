# `src/domain` — device model and shared types

Device-type identity, band groups, capability sets, and the shapes the UI
renders. Depends on nothing (no transport, no codec, no React) so both the
codec and the UI can import it without creating a cycle.

Populated in **Stage 2** of `docs/roadmap.md`.
