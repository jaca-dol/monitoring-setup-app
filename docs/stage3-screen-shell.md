# Stage 3 — screen shell

The one screen every device type shares (PRD B4, REQ-A-14), built against static
models. No NFC in this stage's import graph; Stage 4 supplies a real model.

## The rule that shapes everything

Section order is **fixed and identical on every device type**:

```
Control → Measurement → Device → Network → Power → Actions
```

Adaptation happens *within* sections, by omitting rows that do not apply — never
by reordering or dropping a section. That is what makes the screen learnable: an
installer who has used it on an EM300 finds the same things in the same places
on an iDOL53.

Mechanically, `Row` renders nothing when its value is null, so "showing only
applicable rows" falls out of the data rather than out of per-type branching in
the sections.

## Layout

| File | Role |
| ---- | ---- |
| `src/domain/screen.ts` | `DeviceScreenModel` and the section order. Pure data. |
| `src/ui/components/primitives.tsx` | `Section`, `Row`, `Button`, `ToggleRow`, `Hint`, themes. |
| `src/ui/sections/*.tsx` | One component per section. |
| `src/ui/screens/DeviceScreen.tsx` | Composes the six sections in order. |
| `src/ui/preview/previewModels.ts` | Static models. **Scaffolding — delete at Stage 4.** |
| `src/ui/screens/DeviceScreenPreview.tsx` | Device-type switcher. **Scaffolding.** |

The app now has two tabs: **Screen** (this shell) and **Probe** (the Stage 1/2
NFC diagnostics, still needed against hardware). Stage 4 merges them.

## Preview data is real data

The static models carry values copied from the four devices read on 2026-09-16
and 17, not invented ones, so the layout is checked against realistic content: a
16-character serial number, a DevEUI, a four-tile measurement row, a negative
SNR, and the never-joined case that reports no signal at all.

The three previews were chosen to cover the cases that differ:

| Preview | Exercises |
| ------- | --------- |
| iDOL53 (UC501) | 24 V supply row above a backup-labelled battery; empty measurement section; no signal reading |
| EM500-CO2 | Four measurement tiles; joined; Good verdict with positive SNR |
| EM300-TH | Two measurement tiles; disconnected; negative SNR |

## Visual design

Taken from `docs/SmartAdjust_concept_screens.html`, with one substitution: the
navy is dol-sensors' brand blue **`#004077`**, not the `#1C3E6F` the concept
HTML happens to carry.

The design is **light only**. An earlier build of this stage followed the system
colour scheme and produced a dark-grey app that looked nothing like the concept;
`src/ui/theme/index.ts` now defines a single light palette and no dark variant.

Structure that matters, beyond colour:

- **Section headings sit outside the cards** — an icon, a title and a help
  affordance on the pale page, with the rows beneath in a white rounded card
  with hairline dividers. This is what gives the concept its airy feel.
- **A navy app bar** names the dol-sensors *article*, with `FW · HW · -band`
  beneath it. That is the concept's first callout, against REQ-A-01/A-02: the
  screen opens as a dol-sensors product, not as a Milesight converter.
- **Rows are label + sub-label on the left, value + detail on the right**, with
  a pill, chevron or control where the concept uses one.
- **The apply bar is green and last**; save and share are white cards above it.

| Token | Value |
| ----- | ----- |
| Navy (brand) | `#004077` |
| Page | `#EEF0F2` |
| Card | `#FFFFFF` |
| Divider | `#E6E8EA` |
| Ink / muted | `#1C1C1C` / `#6B7280` |
| Green (apply, good) | `#3E8B52` |

## Decisions taken in this stage

**Measurement tiles wrap rather than scroll.** PRD B4 says "one value or a row
of values depending on parameter count". A single reading takes the full width;
several become tiles that wrap. With pressure added, the EM500 has four —
enough that a non-wrapping row would either truncate or scroll horizontally on a
phone.

**The verdict leads, values follow.** PRD B5 says the installer needs a verdict,
not raw numbers. The verdict is the largest text in the Network section; RSSI,
SNR and the "usable above −100 dBm" limit sit beneath it in small text.

**No channel plan anywhere.** REQ-A-09 says it is written with the region and
never displayed, so it does not appear in the section at all.

**Save and share are rendered but disabled.** They are REQ-A-17, whose priority
the PRD marks TBD. Laying them out keeps the section's shape honest; disabling
them stops an unbuilt feature looking like a working one.

**Region is one row with the alternatives named**, as the concept has it —
"Change to IN865 or RU864" as the sub-label, the current region as the value,
and a chevron. When there is nothing to choose the row shows "Fixed on this
hardware" and **no chevron at all**, so it reports without inviting a tap. The
concept's callout is explicit about that being the point.

**The AppKey appears as a status row, never a value.** The concept shows
"AppKey / Loaded in production / [Verified]". That is exactly the right shape
for a key the app must never display or export (REQ-A-15), so the model carries
an `AppKeyStatus` and has no field a value could occupy. A test asserts nothing
32-hex-shaped reaches the screen.

## Where the concept screens and the PRD disagree

The concept's own footer says: *"Where a screen and a requirement disagree, the
requirement governs."* Two cases, both resolved in the PRD's favour:

| Concept screen | PRD | Built |
| -------------- | --- | ----- |
| Middle network row is "Join status / Joined" | REQ-A-10: show whether the device reaches the gateway, **not** LoRaWAN join state | "Connection / Connected" |
| A "Marginal" pill at −104 dBm | PRD B5 has no Marginal verdict; below −100 dBm is "Unusable" | "Unusable" |

Both are worth raising with whoever owns the concept, since the screens will
otherwise keep showing something the app does not do.

## Still open — carried into Stage 4

1. **REQ-A-08 vs. the hardware.** All four units report `supportFreq: 3` —
   EU868, IN865 and RU864 — while REQ-A-08 says "-868M" devices show static
   EU868 text and no control. The shell renders whichever the model says, so
   this is a one-field change once decided, but the Network section cannot be
   called finished until it is. See `docs/stage2-device-model.md`.
2. **The signal verdict is not computed.** It arrives as data. Roadmap task 10
   builds it and is blocked on the SNR presentation decision (PRD B5). The
   hardware evidence that SNR goes negative is in `docs/stage2-device-model.md`.
3. **The qualified-revision verdict has no source.** PRD B3 asks for firmware
   and hardware revision "with qualified-revision verdict". No list of qualified
   revisions exists in the PRD, the protocol reference or the SDK, so the model
   carries `unknown` and the screen prints "not checked". Someone at dol-sensors
   needs to own that list.
4. **Reporting-interval source wording.** REQ-A-12 requires the source be named.
   The preview says "set from the gateway", taken from the PRD's own framing;
   confirm that is the wording Product wants in front of installers.
5. **The concept shows a "Configuration" row with a chevron** on the iDOL53 and
   the UC501, opening a sub-screen of serial parameters. The row is rendered;
   the sub-screen behind it does not exist and is not in any stage yet.
6. **The concept's band groups differ from the hardware on hand.** It shows the
   iDOL53 and EM500 as `-915M` on US915 with AU915/AS923 alternatives, and only
   the EM300 as fixed `-868M`. Every unit tested is `-868M` reporting
   EU868/IN865/RU864. This is the same REQ-A-08 question as item 1, and the
   concept is evidence that "-868M means fixed" was the design intent — worth
   putting to Product alongside the hardware reading.
