# dol-sensors monitoring setup — project guide

## What this is
A React Native (TypeScript) prototype for a new, standalone app that commissions three wireless
sensor types over NFC: the iDOL53 Ammonia (a DOL53 sensor + Milesight UC501 controller, sold as
one article), the Milesight EM500-CO2-T-H, and the Milesight EM300-TH. It is unrelated to
SmartAdjust (a legacy app built by external consultants, serving different capacitive sensors) —
do not assume shared code, shared conventions, or shared architecture with SmartAdjust.

This is explicitly a **prototype**, not a from-day-one production commitment. The point of this
build is to find out whether React Native holds up for raw NFC work in practice.

## Source materials in this repo
- `docs/PRD-WIRELESS-US-001-B.md` — requirements. This is the source of truth for scope and
  behavior. If code and PRD disagree, stop and ask rather than picking one.
- `docs/milesight-protocol-reference.md` — the IPSO-style payload format for the UC501,
  EM300-TH, and EM500-CO2, as published by Milesight. This defines the data payload — channel
  IDs, types, byte layout — once a read/write is happening. It intentionally does not cover NFC
  transport; that lives in the SDK (see below).
- `sdk/` (`toolbox-sdk@2.1.6`) — **ships a complete NFC transport layer**, not just a data
  codec (an earlier read of this SDK was wrong — corrected below). `service/nfc` contains
  `NfcProxy` (tag-chip detection, session start/stop/restart including iOS long-restart
  handling, transceive with retries/timeouts), `NfcProtocol` (the frame/chunk/ACK write
  protocol), `NfcCommander`/`NfcCommanderV2`, `NfcTracker`, `NfcCompatibility`, `NfcConverter`.
  It hard-pins `react-native-nfc-manager@2.1.8` as a peer dependency and patches that library's
  Android Java source via a postinstall step. All three target devices (EM300-TH, EM500-CO2,
  UC50x/UC51x incl. the iDOL53's UC501) are represented as first-class device configs, with
  `read('nfc')` / `write(deviceInfo, 'nfc')` / `NFC.powerOn()`/`powerOff()`/`reset()` mapping
  directly onto REQ-A-05/A-06.

  **Decision made: adopt this transport as the Stage 1 starting point** rather than
  reimplementing raw transceive from scratch — it already covers exactly the hardware-level
  risk Stage 1 exists to de-risk. Stage 1 is now "validate the SDK's read/write against real
  hardware," not "reverse-engineer the protocol." Known trade-offs accepted with this decision,
  for a prototype phase:
  - Pinned to `react-native-nfc-manager@2.1.8` — no v4/New Architecture path for now. Revisit
    only at the production-commitment decision point, not before.
  - The postinstall patch mutates `node_modules` at install time. Don't rely on this silently —
    inspect what the patch changes and commit it via `patch-package` (or equivalent) so builds
    are reproducible in CI and for every developer, rather than depending on a live postinstall
    step nobody has read.
  - The SDK also ships `service/password` (a `DevicePasswordManager` persisting device
    passwords via `react-native-mmkv`), `utils/logger`, `service/file`, and a zip-archive export
    path. **If password handling is invoked on reads (likely, since these are
    password-authenticated devices), do a narrow check now** — does anything here log or
    persist a password or AppKey anywhere it shouldn't — rather than waiting for the full
    Stage 5 security review, which still happens before the write path.
  - The SDK also pulls in BLE, WiFi (`react-native-wifi-reborn`), network-info, location-enabler,
    document-picker, file-viewer, fs, and zip-archive dependencies — presumably because it's a
    general multi-transport, multi-product SDK and NFC is only one part of it. Before assuming
    this is fine: confirm whether any of those code paths are actually reachable from
    `read`/`write`/`powerOn`/`powerOff`/`reset`, and whether Android manifest merging pulls in
    WiFi/location permissions regardless. An installer tool that's explicitly offline-only
    (REQ-A-16) requesting location access is worth a deliberate decision, not a default.
- `docs/roadmap.md` — the staged build plan. Work stage by stage; don't skip ahead.

## Known open items — do not silently resolve these
- **Ammonia measurement channel needs dol-sensors' own DOL53 interface spec.** The iDOL53 is a
  Milesight UC501 (generic multi-interface controller) paired with dol-sensors' own DOL53
  ammonia sensor — the UC501 protocol table has no ammonia-specific channel because the
  controller doesn't know what's wired to it. The right channel (ADC analog vs. RS485/SDI-12
  digital) and, if analog, the scaling formula, comes from the DOL53's own interface
  documentation, not from Milesight. Don't guess this — ask whoever has the DOL53 hardware
  spec, and treat it as an internal lookup rather than a vendor dependency.
- **SNR presentation is undecided** (scale-ceiling vs. minimum-threshold reading). Build the
  signal verdict logic so this is a single, clearly-marked constant/config to change, not
  something buried across multiple files.
- **Released app name is undecided.** Use a clearly temporary package/bundle identifier and
  display name (e.g. reference "monitoring setup — working title") rather than guessing a real one.

## Stage discipline
Follow `docs/roadmap.md`. In particular:
- Stage 1 (raw NFC transport against real hardware) is the highest-risk piece and gates
  everything else. Do not build UI or protocol decoding ahead of proving raw transceive works.
- Stage 5 (password/AppKey handling) is a dedicated security review before the write path —
  treat it as such, not as a checkbox.
- When a stage's real-hardware gate can't be tested yet (no device on hand, blocked item),
  say so explicitly and stop rather than mocking around it and moving on silently.

## Conventions
- TypeScript, strict mode.
- Keep the NFC transport layer (raw byte read/write) separate from the protocol codec layer
  (IPSO payload encode/decode) separate from the UI layer — these have different risk profiles
  and different rates of change.
- Prefer small, testable pure functions for payload encode/decode (channel ID/type/length parsing)
  over inline parsing in UI code — this is the part most worth unit-testing without hardware.
