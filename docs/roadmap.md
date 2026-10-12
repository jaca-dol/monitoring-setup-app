# dol-sensors monitoring setup — build plan

Based on PRD-WIRELESS-US-001-B (v2.0) and the concept screens you shared earlier. This is a genuinely different situation from the SmartAdjust question we looked at before — that's legacy code your team doesn't own, built by external consultants with no current point of contact, serving a different sensor line (capacitive) that your team has never used. It isn't a candidate to extend or share code with; this is a clean, single-purpose, NFC-only app for three device types (iDOL53 Ammonia, EM500-CO2-T-H, EM300-TH), built and owned by the monitoring team from scratch.

**Framework: React Native, as a prototype.** You've confirmed this as your starting point, and it holds up well for a first build: `react-native-nfc-manager` gives you raw-MIFARE/ISO7816 primitives without hand-writing the bridging layer, the UI is a genuinely simple repeated template (good fit for sharing across platforms), and there's no legacy codebase pulling you toward staying native. The Milesight SDK finding (their native side is a portable data codec, not something that required RN specifically) doesn't change this — it just means embedding their codec would have been about equally easy in any framework, so it's a neutral fact for you rather than a point in RN's favor or against it. Treating this build as a prototype is the right frame given your team is new to cross-platform work: it's the vehicle for learning whether RN holds up in practice, not a one-way commitment.

---

## Pros and cons of building this as a new React Native app

| | |
|---|---|
| **Pros** | Single codebase for two platforms, for an app whose UI is genuinely simple and repetitive (one screen template, five sections, same order, per REQ-A-14) — the case for sharing UI code is much stronger here than it was for SmartAdjust's more idiosyncratic screens. |
| | No legacy code to migrate or protect — you're not weighing "rewrite vs. extend," you're just picking a stack for a green-field app. |
| | `react-native-nfc-manager` gives you the same raw-MIFARE / ISO7816 primitives you'd write natively, without writing the bridging code yourselves. |
| | The app must run alongside SmartAdjust on the same phone (REQ-A-19) — a fresh bundle ID / package name with no shared native dependencies is simpler to keep isolated than trying to merge functionality into SmartAdjust's existing native codebases. |
| | Small scope (3 device types, no cloud, no accounts, no complex navigation) plays to RN's strengths and away from its weaknesses (RN's rough edges tend to show up in large, long-lived, complex apps — this isn't one). |
| **Cons** | Your team has never shipped a cross-platform app — there's a real ramp-up cost even for a small app, and it lands entirely on this project's timeline since there's no earlier project to have absorbed it. |
| | The hard technical risk isn't the framework, it's Milesight's NFC protocol itself — and per the PRD's own open action items, **you don't have that spec or SDK yet.** This is a blocking dependency on Milesight, not a coding task, and it sits in front of almost everything else. |
| | `react-native-nfc-manager` is mid-transition to a new major version (v4, beta, New Architecture) — worth pinning a version deliberately rather than "npm install latest" on day one. |
| | A few requirements are still open decisions, not settled specs (SNR scale direction in B5, the released app name, REQ-A-17's priority is literally marked TBD) — these need answers before or during early development, not after. |

---

## Open blockers to resolve before (or very early in) development

Straight from the PRD's own action table — these aren't yours to solve alone, but they block real progress:

1. **Milesight NFC protocol spec or SDK** — sourcing/product owns this; REQ-A-01 through REQ-A-13 all assume you can read/write over NFC to these devices, and you can't build against an unknown protocol.
2. **Confirm the EM500 and EM300 (and the UC501-read ammonia value) actually expose "last measured value" over NFC** — needed for REQ-A-07; the PRD flags this as unverified for the UC501 path specifically.
3. **SNR presentation decision** — the concept screens show a 0–20 dB scale, but the PRD flags that a *higher* SNR is better on LoRaWAN, so the useful number is a minimum threshold, not a scale ceiling. This changes a UI component's design, not just a copy tweak — resolve before building the signal card.
4. **Released app name**, checked against app stores and dol-sensors trademarks — cheap to decide now, expensive to change after a store listing exists.

None of these block scaffolding or architecture work (below), but #1 blocks all real NFC development, so it's worth pushing on immediately in parallel with early setup.

---

## Task estimate

Sizes are rough effort bands, not calendar dates — actual duration depends on how quickly the Milesight spec lands and how much your NFC spike (from the earlier framework research) already de-risked the raw-transceive question. **S** = under a day, **M** = a few days, **L** = the better part of two weeks, assuming one developer working with Claude Code.

| # | Task | Size | Depends on |
|---|---|---|---|
| 1 | Project scaffolding: RN init, TypeScript config, lint/format, folder structure, CI skeleton | S | — |
| 2 | Pin and integrate `react-native-nfc-manager`, confirm raw MIFARE transceive works against a real iDOL53/UC501 tag on both platforms | M | NFC spike from earlier research |
| 3 | Validate the SDK's (`toolbox-sdk`) NFC read/write against a real EM500/EM300/UC501, incl. confirming the reachable-permission-surface and password-handling questions flagged during SDK review | S–M | SDK adoption decision (made — see CLAUDE.md); smaller than originally estimated now that raw transceive comes from the SDK rather than from scratch |
| 4 | Device identification & band-group detection (REQ-A-02) — read device type off the tag, pick the right screen config | M | Task 2, 3 |
| 5 | Shared screen shell: the five-section layout (Control, Measurement, Device, Network, Power, Actions) that adapts per device type (REQ-A-14) | M | Concept screens (already have) |
| 6 | Full-read flow: one NFC tap → decode all B3 fields → populate the screen (REQ-A-06, A-07) | L | Tasks 3, 4, 5 |
| 7 | Control section: power on/off toggle, reboot button (REQ-A-05) | S–M | Task 3 |
| 8 | Network section: region drop-down scoped to band group, static-EU868 special case, channel-plan-on-write logic hidden from UI (REQ-A-08, A-09) | M | Task 3 |
| 9 | Connection state as connected/disconnected rather than join state (REQ-A-10) | S | Task 3 |
| 10 | Signal verdict logic (Good/Weak/Unusable/Disconnected per the B5 table) | S–M | **Blocker #3** (SNR decision) |
| 11 | Power section: battery display, iDOL53's 24V-supply-above-battery special case (B3, REQ-A-04 area) | S–M | Task 3 |
| 12 | Password/AppKey handling: device-access password used but never exposed; AppKey never shown, logged, or exported (REQ-A-03, A-15) | M | Task 3 — security-sensitive, worth a dedicated review pass |
| 13 | Write flow: apply-settings NFC bar, atomic apply (don't leave a half-applied device) | L | Tasks 6–11 |
| 14 | Save to profile / share settings, matching SmartAdjust's existing behavior (REQ-A-17) | M | **Blocker #4 priority is TBD** — confirm before scheduling |
| 15 | Offline-only validation pass: confirm nothing in the app assumes gateway/cloud reachability (REQ-A-16) | S | Tasks 1–14 substantially done |
| 16 | Startup NFC-capability check with clear messaging on unsupported handsets, plus minimum-OS-version gating (REQ-A-18) | S | — |
| 17 | Packaging/naming: distinct bundle ID/package name, verify coexistence with SmartAdjust on one device (REQ-A-19) | S | **Blocker #4** (app name) |
| 18 | End-to-end hardware pass across all three device types, both band groups where applicable | M | Everything above |

---

## Suggested roadmap — architecture components, tested incrementally

Structured so each stage produces something you can actually test against real hardware before moving on, per your "step by step" preference:

**Stage 0 — Foundations (tasks 1, 16)**
Scaffolding, tooling, and the startup capability check. Nothing NFC-specific yet; testable via normal app-boot on both platforms.

**Stage 1 — Raw NFC transport (tasks 2–3)**
Prove you can talk to real hardware at the byte level before building anything else on top. This is the highest-risk stage and the one most worth doing first and in isolation — a single script/screen that dumps raw bytes from a tag, nothing more. Gate: don't proceed to Stage 2 until this works against at least one real iDOL53 and one real Milesight device.

**Stage 2 — Device model (task 4)**
Turn raw bytes into "this is an EM300-TH, EU868, here's its capability set." Testable by tapping each of your three physical device types and confirming correct identification.

**Stage 3 — Screen shell (task 5)**
Build the shared five-section layout with static/mock data. Fully testable without hardware — this is UI work, and it's a good moment to sanity-check the layout against the concept screens before wiring in real reads.

**Stage 4 — Read path (tasks 6–11)**
Wire the real device model into the shell, section by section (Control, then Measurement, then Device, then Network, then Power) — each section is independently testable against hardware as it lands, rather than waiting for the whole screen to be read-complete.

**Stage 5 — Security pass (task 12)**
A dedicated review of password/AppKey handling before you build the write path — worth doing as its own stage since a mistake here (a leaked AppKey, a logged password) is the kind of bug you want caught by design, not by testing.

**Stage 6 — Write path (task 13)**
The apply-settings flow, built last among the NFC work because it's the highest-consequence one (a bad write can brick a device) and benefits most from everything above already being solid.

**Stage 7 — Secondary features (task 14)**
Save-to-profile / share-settings, once the core commissioning flow works end to end.

**Stage 8 — Release readiness (tasks 15, 17, 18)**
Offline validation, packaging/coexistence with SmartAdjust, and a full hardware regression pass across all three device types.

This ordering front-loads the two things most likely to derail the project (raw NFC transport, and the still-unresolved Milesight protocol dependency) so you find out early whether the plan holds up, rather than discovering it after the UI is polished.
