# Stage 4 — read path

One NFC tap fills the Stage 3 shell (roadmap tasks 6–11).

The shell is unchanged from Stage 3. It has no idea whether its model came from
hardware or a fixture, which is exactly what made it buildable without a sensor
— and is why wiring the real read in was a matter of supplying a model, not
rewriting the UI.

## Layout

| File | Role |
| ---- | ---- |
| `src/codec/screenModel.ts` | Payload → `DeviceScreenModel`. Pure. |
| `src/codec/measurements.ts` | Pulls readings out of the payload's `status[]`. |
| `src/codec/signalVerdict.ts` | PRD B5 verdict. Pure. |
| `src/config/network.ts` | The open REQ-A-08 region policy, one flag. |
| `src/transport/nfc/commands.ts` | Power on/off and restart. |
| `src/ui/screens/DeviceReadScreen.tsx` | Read flow, command confirmations. |

The app now has three tabs: **Read** (this), **Preview** (Stage 3 static
models), **Probe** (Stage 1/2 diagnostics).

## Measurements come from the device's own read-out list

`status[]` is the list the device itself publishes, and only its measurement
entries carry a `type`:

```
{name: 'CO2 concentration', value: '497', unit: 'ppm', type: 'co2concentration'}
```

Reading that beats re-deriving values from scattered top-level fields: the
device has already decided what counts as a measurement, already formatted the
value, and already named the unit. Readings are emitted in **capability order**,
so the Measurement card shows the same values in the same places on every unit
of a given type.

## The signal verdict implements B5 and nothing more

PRD B5's table is defined on RSSI and connection alone:

| Verdict | Condition |
| ------- | --------- |
| Good | RSSI better than −95 dBm |
| Weak | −95 to −100 dBm |
| Unusable | below −100 dBm |
| Disconnected | no uplink has reached the gateway |

**No verdict depends on SNR**, so the open SNR-presentation question does not
block this. SNR is carried through and displayed; nothing grades it. When the
decision lands it changes presentation in `src/config/signal.ts`, not the
verdict function.

### Disconnected wins outright, and that is load-bearing

A UC501 that has never joined reports `rssi: 0`. Since 0 dBm is "better than
−95", evaluating RSSI first would render **Good** for a sensor that has never
transmitted — telling an installer to walk away from something that is not
working. So:

1. `joinStatus === 0` → Disconnected, and RSSI is not evaluated.
2. A `0` reading from an unjoined device is normalised to `null` at the edge,
   so nothing downstream can mistake it for a measurement.

Both paths are tested against `uc501-868m-v3.ts`, the unit that actually
reported `0/0`.

## The `reset()` trap is closed by construction

The SDK exposes two similar commands:

- `NFC.restart()` — reboot, keeps the configuration. This is REQ-A-05's reboot.
- `NFC.reset()` — factory reset. Wipes settings **and rewrites the stored device
  password to `123456`**.

Milesight's README documents `reset()` under the heading "Restart". Wiring a
reboot button to it would factory-reset commissioned devices in the field.
`src/transport/nfc/commands.ts` does not wrap `reset()` at all, so it cannot be
reached by accident.

Power-off asks for confirmation (it stops the sensor reporting until someone
returns to it); power-on does not. Every command re-reads afterwards, so the
screen never shows a state the device has since left.

## NFC feedback on Android

iOS shows a system Core NFC sheet during a scan — "Hold Near Tag", a spinner,
its own cancel. That is why the vendor app appears to have progress feedback for
free on an iPhone. **Android provides none of it.** The only cue is the
handset's tag-discovery vibration, which says a tag was seen but nothing about
whether the exchange is working, stalled or finished.

So the app draws its own. `NfcSheet` is a bottom sheet raised for every NFC
operation, with four states:

| State | What it says |
| ----- | ------------ |
| Waiting | "Looking for a sensor", plus where the antenna is. Indeterminate bar. |
| Working | The command being run, and a real 0–100 % bar. |
| Success | Momentary; the screen beneath carries the result. |
| Error | The failure reason, and Close rather than Cancel. |

The source is the SDK's own `NfcTracker`, subscribed in
`src/transport/nfc/progress.ts`. It already counts steps per command type and
smooths large jumps — those were the "平滑过渡" lines in the bring-up logs — so
the sheet is **not** animated on top of that. Double-smoothing would make a
stalled exchange look like it was still moving, and a 13-second iDOL53 read is
long enough that the difference matters.

### The SDK's `error` event is not a failure

The tracker emits `error` for **recoverable** steps as well as terminal ones. On
a UC501 the first read of an app session goes:

```
canExecute (IPSOv2 probe) → timeout → tracker emits `error`
  → SDK falls back to the legacy path → readFlash succeeds
```

Treating that event as terminal showed a failure on a read that then completed —
and only on the *first* read, because `SupportIPSOActionCache` short-circuits
the probe from then on (`canExecute 1ms` on the second read).

So the rule is: **only the caller's promise decides the outcome.** Tracker
errors land in a `notice` field and render as "First attempt did not answer —
retrying"; the sheet enters its error state only when the operation's promise
rejects. A `progress` event after a notice clears it, since progress means the
SDK recovered.

Two details worth keeping:

- The subscription lives for the screen's lifetime, not per operation, because
  `beforeStart` fires before the caller's promise is even created. That event is
  the "armed, waiting for a tag" state — the one Android gives no sign of.
- The sheet names the command (`Restarting the sensor`, `Switching the sensor
  off`) rather than always claiming to read, and falls back to neutral wording
  for a command it does not recognise.

## Commands are one tap, and do not re-read

An earlier version re-read the device after every command, "so the screen
reflects the device rather than what we assume the command did". On hardware
that turned a single power toggle into **two NFC taps**, where the vendor app
needs one.

It was the wrong trade. `sendCommand success: powerOn` **is** the device
acknowledging the change — a second session re-reads a value the device already
confirmed, and adds several seconds to an action an installer repeats. So a
successful command now updates the screen locally and stops.

There is also no confirmation dialog on the power toggle, matching the vendor
app. Switching a sensor off is reversible with the same control, and the toggle
already states the intent. Restart keeps its confirmation: repeating it does not
undo it, and it interrupts a device that may be mid-report.

The **settings write** is the exception and keeps its verification read — see
`docs/stage6-write-path.md`. A region that silently did not take is the failure
REQ-A-13 exists to catch, and unlike a toggle there is no acknowledgement that
proves the value landed.

## What is deliberately not wired

- **Region change** and **Apply sensor settings** raise a "not yet available"
  dialog. Writing a region also writes the channel plan (REQ-A-09), and a
  half-applied device is exactly what REQ-A-13's atomic apply exists to prevent.
  That is the Stage 6 write path, and Stage 5's security review comes first.
- **Save to profile / share settings** remain disabled (REQ-A-17, priority TBD).

---

## Open items

### 1. REQ-A-08 region policy — now a single flag

`src/config/network.ts` has `RESTRICT_868M_TO_SINGLE_REGION`, defaulting to
`true`: an "-868M" device is pinned to its current region and the row shows
static text with no chevron.

That follows the PRD and the concept screens, which agree. The hardware
disagrees — all four units report `supportFreq: 3`, meaning EU868, IN865 and
RU864. `CLAUDE.md` names the PRD as the source of truth for behaviour, so the
default follows it, but this is **not a resolved question**: flip the flag to
offer every region the hardware reports.

### 2. `powerSupplyState` encoding is unconfirmed

Only the UC50X reports it, and nothing in the PRD, the protocol reference or
the SDK documents its values. Both units read so far report `2` while
mains-powered, so `2` is treated as present and `0` as absent; anything else
reports "Unknown" rather than asserting a state.

This drives the iDOL53's 24 V supply row, whose whole purpose is to stop a
mains-powered unit reading a healthy battery percentage from looking healthy
when the supply is gone. **Confirm the encoding before that row is trusted in
the field** — ideally by reading a UC501 with the supply disconnected.

### 3. The device password is still unresolved (REQ-A-03)

Every control command is authenticated. The SDK resolves the password through
`DevicePasswordManager.getPasswordById(tagId)`, which falls back to the
hardcoded default `123456`, and nothing in this app injects the supplier's
production password.

These commands are the first thing that will expose that gap on hardware. A
`wrongPassword` failure when pressing Restart is the expected symptom, not a
transport bug. `setDefaultPassword()` is the injection point when the answer
arrives.

### 4. No qualified-revision list exists

`revisionVerdict` is hardcoded `unknown`, so the Device section prints
"Revision not checked". PRD B3 asks for a verdict against a qualified list that
does not exist in any source material. Someone at dol-sensors needs to own it.

### 5. The IPSOv2 probe cache does not survive a restart

`SupportIPSOActionCache` is in memory only, so every app launch re-probes each
tag. On a UC501 that costs roughly 7 seconds on the first read of a session —
`canExecute 5073ms` versus `canExecute 1ms` on the second — and produces the
retry notice described above.

Persisting the per-UID result (MMKV is already a dependency) would make the
first read of a session as fast as the rest. Not done: it is an optimisation,
and caching a protocol decision across launches deserves a think about how it
gets invalidated when a device's firmware changes.

### 6. `connectionDetail` is always null

The concept screens show "Joined · 4 min ago". Nothing in the payload gives a
time since last uplink — `systemUptime` is device uptime, not contact time — so
the detail line is left empty rather than computed from something that does not
mean that.

---

## Hardware gate

Stage 4's gate is each section verified against real hardware, per device type.
Reading is proven; the commands are not — nothing has yet sent a `restart` or a
`powerOff` to a physical sensor.

Worth checking on device, in this order:

1. **Read** each of the three device types and confirm every section matches
   what Milesight Toolbox shows for the same unit.
2. **Restart** an iDOL53. This is the first authenticated command, so it tests
   open item 3 as much as the command itself.
3. **Power off then on**, on a unit you are willing to interrupt.
4. **Disconnect the 24 V supply** on a UC501 and re-read, to settle open item 2.
