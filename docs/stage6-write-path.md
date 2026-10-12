# Stage 6 — write path

The apply-settings flow (roadmap task 13; REQ-A-08, REQ-A-09, REQ-A-13).

Built last among the NFC work because it is the highest-consequence piece. The
governing rule is REQ-A-13: never leave a half-applied device.

---

## Read this first: it cannot be tested on the hardware you have

Stage 6 is **written but unverified**, and not because of a missing device — the
four sensors on hand have nothing this stage can write.

1. **The only in-scope writable setting is the region.** Everything else in the
   PRD is either read-only (reporting interval, REQ-A-12), a command rather than
   a setting (power, reboot — Stage 4), never settable (AppKey), or still TBD
   (save/share, REQ-A-17).
2. **All four units are `-868M`**, and `RESTRICT_868M_TO_SINGLE_REGION` pins
   them to EU868 with no alternatives. So the region row shows static text, no
   change can be staged, and Apply stays disabled.
3. **The regions that would exercise it are refused or absent.** US915 and
   AU915 are deliberately refused (below). AS923 and the others are writable but
   no device on hand is in a band group that offers them.

So the whole flow — stage a change, confirm, write, verify — has run only
against unit tests. Getting real coverage needs either a non-868M device, or
flipping `RESTRICT_868M_TO_SINGLE_REGION` to `false` and writing IN865 or RU864
to an 868M unit. **The second is a real change to a real device**: it would
leave the sensor on a region its gateway is not listening on until it is written
back. Worth doing deliberately, on a unit that is not deployed, and not by
accident.

REQ-A-03 is also still open (see `docs/stage5-security-review.md`), so the first
real write will likely fail on authentication before it reaches any of this.

---

## Atomicity comes from the vendor, not from us

Worth being precise about, because it is the requirement that matters and it
would be easy to claim credit for.

`NfcController.writeFlash()` does **not** write field by field:

1. It obtains the whole flash image — re-reading it from the device when the
   SDK store holds none, which is our case.
2. It applies the changed fields onto that image natively
   (`DeviceUtils.setFlashInfo(rawData, settingJSON)`).
3. It writes the **entire image back** in one `writeFlash` command followed by
   `sendFlashData`.

There is no sequence of per-field writes that could stop half way. A write
either lands or it does not.

Two consequences we get for free, both of which the protocol reference asks for:

- Every apply is built from a **freshly-read full state**, never from a stale
  local model that could clobber fields the app did not intend to touch.
- Because our read path uses `readFlash()` and never populates the SDK store,
  the re-read inside `writeFlash` is guaranteed to happen rather than reusing
  something older.

What `src/transport/nfc/writeSettings.ts` adds is not atomicity. It is:

- refusing to start when the inputs are wrong;
- a timeout whose message says the device state is now **unknown** rather than
  implying nothing happened;
- a verification read afterwards.

## Verification is not decoration

`applySettings()` reads the device back and compares. A write that reports
success but did not take is the failure mode that matters, and the only way to
know is to ask the device.

`unappliedFields()` returns the fields whose read-back value does not match what
was asked for. If any are listed the user is told the settings **may not** have
applied and to read again before leaving the site — deliberately not "failed",
because the truth at that point is unknown.

## Staging, then applying

A region choice is **staged, not written**. The screen shows the staged value
with "Not yet written to the sensor", Apply is enabled only when something would
actually change, and the confirmation dialog lists the changes in plain language
before anything reaches the device. Re-reading discards staged changes.

That keeps the write a single deliberate act, which is what makes an atomic
apply meaningful in use rather than just in implementation.

---

## REQ-A-09 is two different fields, and only one is documented

The requirement reads:

> Writing a region also writes the channel plan (sub-band 1 for US915/AU915,
> AS923-1 for AS923/Japan). Never displayed, never separately settable.

In the device model those are **not the same field**:

| Region | What "channel plan" means | Status |
| ------ | ------------------------- | ------ |
| AS923 | `channelPlan`, typed `0 \| 1 \| 2 \| 3` = AS923-1…4. So AS923-1 is `channelPlan: 0`. | **Implemented** |
| US915 / AU915 | "Sub-band 1" is a **channel mask**, not `channelPlan`. These regions have 64+8 channels in sub-bands; choosing one means enabling its eight channels. | **Refused** |
| Everything else | No sub-band concept. Only `freqRegion` is written. | Implemented |

The mask encoding for these devices is not in the PRD, the protocol reference or
the SDK, and no US915 or AU915 unit has been read. So `planWrite()` **refuses**
those two regions with an explanation rather than guessing.

That refusal is the safer behaviour, not the lazier one. Writing the region
without its sub-band would be **worse than not writing at all**: the device
would fall back to its default mask and transmit across all 72 channels, where
a gateway listening on sub-band 1 would not hear it. A sensor that looks
commissioned and is silent is harder to diagnose than one that visibly refused.

**To close this**, someone needs to supply the sub-band 1 channel mask for
US915 and AU915 on these devices — most likely from Milesight, or by reading a
US915 unit already configured correctly and recording its `channelMask` and
`freqs`.

---

## One SDK trap handled

After a successful write, `writeFlash` reads `getDeviceInfo(store).sn` to decide
whether to remember the password it used. With our store empty that yields
`undefined`, and `DevicePasswordManager.normalizeSn()` calls `.toUpperCase()` on
it — **throwing after the device has already been written**. The app would have
reported a failure for a write that succeeded, which is the worst possible
reporting error on this path.

`seedSerialNumber()` puts the serial number, and only the serial number, into
the SDK store before the write. No key material, so the property protected in
`docs/stage5-security-review.md` §4 still holds.

---

## Two things learned from the first real write (2026-09-29)

The first setting actually written to hardware was a region change on an
EM300-TH. Both findings below came out of that one attempt.

### The settings JSON is nested, and getting it wrong fails silently

Writing `{"freqRegion": 8}` reported complete success — `sendCommand success:
writeFlash`, the whole 1030-byte image sent — and changed nothing. The device
still read back `freqRegion: 0`.

The SDK's own write path never passes settings straight to the codec. It runs
them through `getSettingJSON` (`model/utils/migrationUtils.ts:211`), whose
accumulator is literally `{pLoRaWANParams: {}}`, and **every LoRa parameter is
nested inside it** — `freqRegion` is in `LORA_PARAMS_KEYS`
(`model/constants.ts:2198`). A top-level `freqRegion` is somewhere the native
codec never looks, so it applied nothing and returned code 1, because nothing
had gone wrong.

That is the exact failure the read-back check exists for, and it is the reason
that check is not optional on this path. It is also why `WritePlan` now carries
`expect` separately from `fields`: the write shape is nested, a read reports
flat top-level fields, and verifying one against the other would never match.

Second, easily-missed part: `getSettingJSON` injects `freqs` alongside a region
change (lines 422-434), with the vendor's own comment explaining that a region
change alone leaves `freqs` un-diffed and therefore unsent.

### A region change resets the LoRaWAN settings — including the AppKey

Noticed in Milesight's app, which warns before writing a region. The string is
in the SDK we ship (`utils/translate/base.json:504`):

> `setting.changeFreqRegionTip`: "Note: Changing support frequency, LoRaWAN
> Settings will revert to default!"

"LoRaWAN Settings" is not vague — the SDK defines that group as
`LoRaSettingsKeys` (`model/deviceInfo/DeviceSettings.ts:7`), and it contains
`applicationKey`, `applicationSessionKey`, `networkSessionKey`, `deviceAddress`,
`appEUI`, `classType` and `adr`.

So a region change can take the **AppKey** with it. A sensor whose AppKey no
longer matches the network server will not join, and an installer would discover
that only after leaving the site — which makes this the highest-consequence
side effect anywhere in the app so far.

The firmware does this, not the app: the SDK carries the warning string but no
logic, so there is nothing to intercept or prevent. The only responsible
handling is to state it before writing, which is what the vendor does and what
`planWrite` now does via `WritePlan.warnings`, surfaced in the confirmation
dialog above the instruction rather than below it.

**Not yet verified**, and worth doing deliberately on a sensor nobody depends
on: whether the reset is confined to the LoRaWAN group, or whether measurement
settings (calibration offsets, reporting interval, thresholds) go with it. The
vendor string says LoRaWAN only; the observed in-app wording is broader. Until
someone reads a sensor, changes its region, and reads it again field by field,
we are repeating Milesight's claim rather than confirming it.

---

## Open items

1. **Untestable on current hardware** — see the top of this document.
2. **US915 / AU915 sub-band mask** — refused until documented.
3. **REQ-A-03 password** — unresolved, and the first real write will hit it.
4. **`applyFromTemplate` and password change are not wired.** `writeFlash`
   supports both. Changing a device password is not in the PRD's scope, and
   templates belong to REQ-A-17 whose priority is TBD.
5. **No partial-failure recovery UI.** If a write times out, the user is told
   the state is unknown and to re-read. There is no automatic retry, on purpose:
   retrying a write whose outcome is unknown is how a device ends up in a state
   nobody predicted.
6. **The scope of the region-change reset is unconfirmed** — see above. Worth a
   deliberate before/after read on an expendable sensor.
7. **Nothing reports what a write changed beyond what was asked.** We hold the
   payload from before the write and the verification read from after it, so
   listing the fields that moved is available and cheap. It would turn the
   region warning from a claim into an observation, and it is the natural next
   step once the reset scope is known.
