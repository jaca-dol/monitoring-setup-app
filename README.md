# dol-sensors monitoring setup (working title)

React Native (TypeScript) **prototype** for commissioning three wireless sensor
types over NFC: the iDOL53 Ammonia (DOL53 + Milesight UC501), the Milesight
EM500-CO2-T-H, and the Milesight EM300-TH.

This is a prototype, not a production commitment — its purpose is to find out
whether React Native holds up for raw NFC work in practice. See `CLAUDE.md` for
the rules this repo is built under and `docs/roadmap.md` for the staged plan.

**The released app name is not decided.** The bundle/package identifier
(`com.dolsensors.monitoringsetup.prototype`) and the display name
("Monitoring Setup (WIP)") are deliberately temporary.

## Status

Stage 0 (scaffolding) only. There is **no NFC code and no protocol decoding
yet** — that is Stage 1, and it is gated on proving raw transceive against real
hardware first.

## Getting started

```sh
npm install
npm start              # Metro
npm run android        # requires Android SDK + JDK
npm run ios            # requires Xcode + `cd ios && bundle exec pod install`
```

Checks (the same set CI runs):

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
```

## Layout

| Path             | Responsibility                                                         |
| ---------------- | ---------------------------------------------------------------------- |
| `src/transport/` | Raw bytes over NFC. Knows nothing about what the bytes mean. _Stage 1_ |
| `src/codec/`     | Milesight IPSO payload encode/decode. Pure functions. _Stage 1–2_      |
| `src/domain/`    | Device types, band groups, capability sets. Imports no other layer     |
| `src/config/`    | Settled constants and explicitly-marked open decisions                 |
| `src/ui/`        | Screens and components. Never parses bytes                             |
| `docs/`          | PRD, Milesight protocol reference, roadmap — source of truth           |
| `sdk/`           | Milesight-supplied SDK and demos, for reference                        |

The three layers have different risk profiles and different rates of change, so
they are kept apart deliberately. `.eslintrc.js` enforces the import direction:
`ui → codec/domain → transport → (nothing)`; codec and domain stay pure.

## Open items

These are tracked in `CLAUDE.md` and `docs/PRD-WIRELESS-US-001-B.md` §B6. Do not
silently resolve them in code:

1. **Ammonia measurement channel** — needs dol-sensors' own DOL53 interface
   spec (ADC vs. RS485/SDI-12, and the scaling formula if analog). Not a
   Milesight question.
2. **SNR presentation** — scale-ceiling vs. minimum-threshold. Isolated to
   `src/config/signal.ts` so it is a one-line change when decided.
3. **Released app name** — blocks store submission and the final bundle ID.
4. **REQ-A-17 priority** (save to profile / share settings) is marked TBD.
