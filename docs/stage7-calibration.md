# Stage 7 — Measurement calibration

New scope, raised by Martin. **Calibration appears nowhere in PRD-WIRELESS-US-001-B** — I
checked; there is no requirement covering it. This document is the design and the open
questions, not a built feature. It needs a PRD requirement (or an explicit decision to build
ahead of one) before it ships.

## What the vendor app does

In the Milesight app, selecting Calibration on an EM300-TH shows a toggle per measurement
channel — Temperature and Humidity. Toggling one open reveals:

```
Numerical Calibration
Current value:      26.5 ℃
Calibration Value   [ -5      ] ℃
Final value:        21.5 ℃
```

The arithmetic is a plain additive offset: `final = current + calibration`. Entering `1` on a
26.5 ℃ reading gives 27.5; entering `-5` gives 21.5. Negative values are normal and expected.
Humidity is identical with `%` in place of `℃`.

This is not a scale or a two-point calibration. It is one signed offset per channel, stored on
the device, applied by the device to everything it reports from then on.

## What the hardware and SDK actually support

Verified against the SDK source and against our own hardware fixtures, which already carry
these fields — we have been reading calibration state since Stage 4 without surfacing it:

| | |
|---|---|
| Shape | `calibration: {enable: boolean, value: number \| string}`, one per measurement channel, inside the same flash image we already read and write |
| Storage | `int16_t calibration_value` in the native `sensor_cfg_t` struct — **signed**, so negatives are representable at the byte level |
| Scaling | Applied inside the compiled native codec, not in JS. Temperature / humidity / pressure carry one decimal (×10); CO2 is whole ppm (×1) |
| Write path | The ordinary `writeFlash` — same command, same password handling, no separate calibration command. It is just more fields in the settings JSON |

`node_modules/toolbox-sdk/src/model/deviceInfo/SensorDeviceInfo.ts:227` declares the type;
`sdk/toolbox-sdk-demo-main/android-demo/app/src/main/cpp/unp.h:695` is the native struct.

Our fixtures show the convention plainly — `__tests__/fixtures/em300-th-868m.ts:58`:

```ts
temperature: {enable: true, value: '15.2', unit: '℃',
  calibration: {enable: false, value: '0.0'}},
```

Note `'0.0'`, a **string** with the channel's decimal count. The codec round-trips through
string formatting, so a calibration value should be written back in the same shape it was read
in. A bare JS number, or the wrong number of decimals, is the most likely way to get a write
that appears to succeed and does the wrong thing.

## Three findings that change the shape of the feature

### 1. The iDOL53 cannot be calibrated this way

`isSupportSetting.ts:42` disables `calibrationSettings` outright for the `UC500` and `UC51X`
model series. The UC501's analog-input struct does contain `calibration_enable` /
`calibration_value` fields in firmware, but the SDK's JSON codec does not expose them on the
`aiSettings` model — there is no supported path to them.

This makes calibration a **two-of-three-device feature**, which cuts against REQ-A-14's "same
screen, same order, every device type." It is consistent with the existing rule that sections
adapt by omitting rows rather than disappearing, but it is the first case where a whole
capability is absent on the dol-sensors article specifically — and the iDOL53 is the one product
that is ours rather than Milesight's. If ammonia readings need correcting, that has to happen in
the DOL53 sensor or in our own payload decode, not in the UC501's flash. This connects to the
already-open DOL53 interface-spec question in CLAUDE.md.

### 2. Nothing validates the value — not the SDK, and so far not us

There is no range, step, or precision check anywhere in toolbox-sdk 2.1.6: no schema, no
validation library, no per-device calibration range table. The only hard limit is the binary
one — signed 16-bit at the channel's scale, so roughly ±3276.7 for temperature.

That limit is far wider than anything physically sensible. A typo of `250` instead of `25` on a
temperature channel would be accepted by the device and would silently corrupt every reading it
sends afterwards. **We have to own the range rules**, because no layer beneath us will. The
vendor app's input constraints are in that app, not in the SDK we share with it.

Proposed, pending a real answer (see open questions):

| Channel | Range | Step |
|---|---|---|
| Temperature | −10.0 … +10.0 ℃ | 0.1 |
| Humidity | −20.0 … +20.0 % | 0.1 |
| Pressure | −100.0 … +100.0 hPa | 0.1 |
| CO2 | −500 … +500 ppm | 1 |

These are deliberately tight — a calibration offset corrects sensor drift or a known siting
error, not a broken sensor. Widening a limit later is easy; recalling sensors that were
silently miscalibrated in the field is not.

### 3. A non-zero calibration has to be visible without going looking for it

Calibration is the only setting in this app that changes what the sensor *reports* rather than
how it connects. An installer arriving at a sensor someone else commissioned needs to know that
the 21.5 ℃ on screen is a 26.5 ℃ reading with a −5 offset on it. If that is only visible after
tapping into a calibration sub-screen, it will be missed.

So the Measurement section should mark a calibrated channel inline — the corrected value, with
the offset shown beside it — rather than only surfacing it in an editor. This is a read-path
change as well as a write-path one.

## Implementation sketch

- **Domain** — add a per-channel `calibration` capability to `CAPABILITIES` in
  `src/domain/device.ts`: which channels are calibratable, and each one's range/step/decimals.
  The iDOL53 gets none.
- **Codec** — extend `src/codec/measurements.ts` to decode the calibration state alongside the
  value. Add a pure `calibrationPlan` module: validate an entered offset against the channel's
  rules, and compute the final value for the preview line. Pure and unit-testable without
  hardware, which is most of the risk here.
- **writePlan** — `src/codec/writePlan.ts` currently produces a flat `fields` record. Calibration
  lives at nested paths (`temperature.calibration.value`), so the plan type needs to carry
  nested paths or the merge step needs to understand dotted keys. Small, but it is a real change
  to a Stage 6 contract rather than an addition beside it.
- **UI** — a calibration editor reached from the Measurement section, one toggle per channel,
  matching the vendor's current / offset / final layout. Reuses the existing apply + NFC-write
  flow; no new transport work.
- **Tests** — the validation and final-value arithmetic are pure functions with obvious edge
  cases (negative offsets, boundary values, decimal formatting, the string round-trip). Those
  carry the stage. The hardware gate is a write-then-read on a real EM300 confirming the offset
  persists and the reported value shifts by exactly the amount entered.

## Open questions — do not resolve these silently

1. **What ranges should we actually enforce?** The table above is my proposal, not a spec.
   Martin or whoever owns sensor accuracy should set these, since the cost of getting them wrong
   is field miscalibration, not a UI annoyance.
2. **Does the iDOL53 need ammonia calibration at all?** If yes, it is a different mechanism
   entirely (DOL53-side, or in our decode) and a separate piece of work — the UC501 route does
   not exist. Worth asking before building the EM-only version, because the answer may change
   how the editor is framed.
3. **Is calibration an installer action or a service action?** It permanently alters reported
   data. If it is not meant to be part of routine commissioning, it should not sit at the same
   level as the power toggle.
4. **CO2 has two more settings we would be choosing to hide or show**: Auto Background
   Calibration (`autoBackgroundCalibration`) and altitude compensation (`altitudeCalEnable` /
   `altitudeValue`). Both are version-gated — ABC needs EM500 HW v2.0 / FW ≥ v1.7, altitude
   needs FW ≥ v1.5 (`EM500CO2DeviceConfig.ts:8`). ABC in particular is not an offset: it lets
   the sensor re-baseline itself over 7 days of ventilated operation. Recommend leaving both out
   of the first cut and deciding deliberately.
5. **Should a calibration offset be part of save-to-profile / share-settings** (REQ-A-17)?
   Arguably not — an offset corrects one physical sensor and should not be copied onto another.

## Gate

Not started. Stage 6's write path is still untested on hardware (no writable setting on the
868M units we have), and calibration is a write. Proving the write path on a real device comes
first — calibration would otherwise be the thing that discovers a write-path bug, on the one
setting where a silent failure corrupts data rather than just not applying.
