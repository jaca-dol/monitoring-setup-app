# Stage 2 — device model

Turns a `readFlash()` payload into "this is an iDOL53, EU868, here is its
capability set" (REQ-A-02, roadmap task 4).

Built against **real payloads from all three in-scope device types**, kept as
fixtures under `__tests__/fixtures/`. They are hardware ground truth, so the
codec layer can be developed and regression-tested without a sensor on the desk.

| Fixture | Device | Firmware / hardware | Captured |
| ------- | ------ | ------------------- | -------- |
| `uc501-868m.ts` | UC501-868M (iDOL53), older batch | V1.6 / V3.0 | 2026-09-16 |
| `uc501-868m-v3.ts` | UC501-868M (iDOL53), newer batch | V1.6 / V3.0 | 2026-09-17 |
| `em500-co2-868m.ts` | EM500-CO2-868M | V1.11 / V2.1 | 2026-09-17 |
| `em300-th-868m.ts` | EM300-TH-868M | V1.11 / V3.1 | 2026-09-17 |

Two UC501s are kept because they differ in ways that each broke an assumption —
see the sub-model note below and the `rssi: 0` note in the observations.

## `deviceInformation` does not put the band in a fixed slot

The first version of this code assumed `subModel1` was always the band, which
is true only of the UC501. The other two put a product variant there and push
the band to `subModel2`, so both identified as UNSUPPORTED:

```
UC501-868M     → {model: 'UC501', subModel1: '868M', subModel2: '0000'}
EM500-CO2-868M → {model: 'EM500', subModel1: 'CO2',  subModel2: '868M'}
EM300-TH-868M  → {model: 'EM300', subModel1: 'TH',   subModel2: '868M'}
```

A second UC501 then showed the slots are not only variably positioned but also
carry unrelated data:

```
UC501-868M (newer) → {subModel1: '868M', subModel2: '0000',
                      subModel3: '0000', subModel4: '0010'}
```

`subModel4: '0010'` matches that unit's `oem` field — a numeric OEM code, not a
product variant. Treating any non-band sub-model as a variant produced the
article key `UC501-0010`, and the device identified as UNSUPPORTED.

`splitModel()` therefore:

- scans all four slots for one shaped like a band (`/^\d{3}M$/`);
- takes the variant from `subModel1` only, and only when it contains a letter —
  which keeps `CO2`, `TH` and `PT100` while rejecting `0010` and `0000`;
- joins base model plus variant into the article key (`EM500` + `CO2` →
  `EM500-CO2`).

The `model` string is parsed the same way when `deviceInformation` is missing.

## Layout

| File | Role |
| ---- | ---- |
| `src/domain/device.ts` | Types, capability sets, display names. Imports nothing from other layers. |
| `src/codec/deviceIdentity.ts` | Pure parse functions: model split, region, band group, active input. |
| `src/transport/nfc/stripKeys.ts` | Removes LoRaWAN key material before the payload leaves transport. |

## What the payload gives us

| Field | Used for |
| ----- | -------- |
| `deviceInformation.model` / `.subModel1` | Base model and band label, without string-parsing `model` |
| `supportFreq` | Band group — the set of regions the hardware accepts |
| `freqRegion` | The region currently written to the device |
| `firmwareVersion` / `hardwareVersion` | Device section (REQ-A-04) |
| `deviceEui` / `sn` | Device identity (PRD B3) |
| `rs232` / `rs485` / `aiSetting` / `gpioSetting` `.enable` | Active input configuration (iDOL53 only, PRD B3) |

Region codes mirror the SDK's own `FREQUENCY` enum and
`SUPPORTED_FREQUENCY_OPTIONS` table in `model/constants.ts`, rather than being
invented here.

## Key material is stripped at the transport boundary

Hardware confirmed the UC501 returns real `applicationKey`,
`applicationSessionKey`, `networkSessionKey` and per-multicast
`appskey`/`nwkskey` on an ordinary read.

`stripKeyMaterial()` **deletes** these fields — it does not mask them to a
placeholder that could be mistaken for a value — and reports which ones were
present so compliance stays observable. The stripped payload is the only form
that leaves `src/transport`, so the domain model, the UI, and anything that
serialises device state (save-to-profile, share-settings, diagnostics export)
cannot leak what they never received.

The write path (Stage 6) will need the real values. It must take them from a
freshly-read payload *inside* the transport layer, never from the domain model.

---

## Open items this stage surfaced — do not silently resolve

### 1. PRD REQ-A-08 disagrees with the hardware on 868M band groups

REQ-A-08 says:

> "-868M" devices show static EU868 text, no control.

The hardware disagrees. The UC501-868M reports `supportFreq: 3`, which in
Milesight's own table is **EU868, IN865 and RU864** — three selectable regions,
not one. `freqRegion: 0` (EU868) is merely the value currently written.

Two readings, and this is a product decision rather than a coding one:

- **The PRD is a deliberate restriction** — dol-sensors only ever ships these
  for EU868, so the app intentionally hides the other two. Then `regionIsFixed`
  should be forced true for this band group, and the reason recorded.
- **The PRD is under-specified** — the drop-down should offer all three regions
  the hardware accepts.

The code currently reports what the hardware says (`regionIsFixed: false` for
this device) and does **not** restrict anything, because `CLAUDE.md` says to
stop and ask when code and PRD disagree. The signal-verdict work in Stage 4 and
the Network section in Stage 3 both depend on the answer.

### 2. A UC501 cannot be distinguished from an iDOL53 over NFC

`UC501 → iDOL53` is a product convention, not a hardware fact. The iDOL53 is a
UC501 plus dol-sensors' DOL53 sensor and a PSU sold as one article (PRD B1), and
the controller cannot report what is wired to it — which is the same reason the
ammonia channel is an open item.

Consequences:

- A bare UC501 on the bench identifies as "iDOL53 Ammonia". That is correct for
  the product but misleading during development.
- **PRD B1 puts the standalone UC501 RS232 converter explicitly out of scope**,
  and it is also a UC501. Nothing in the payload separates it from an in-scope
  iDOL53.

The test unit reports `rs232.enable: true` with RS485, both analog inputs and
both GPIOs disabled. Whether that is how the DOL53 is wired, or whether this
particular unit *is* the out-of-scope RS232 converter, is a question for whoever
owns the iDOL53 hardware definition. It is also a second reason not to guess the
ammonia channel: the protocol reference lists ADC, RS485 and SDI-12 as the
candidate channels, and RS232 is not among them.

### 3. Resolved — pressure is a fourth row on the EM500

**Decided 2026-09-17: show it.** The EM500 returns atmospheric pressure
(1003.9 hPa on the unit tested) alongside CO₂, temperature and humidity. The
concept screens showed three values; the capability set now lists four, on the
basis that removing a row later is cheaper than discovering it was wanted after
the Measurement section is built.

### 4. The iDOL53 capability set has no measurements yet

`CAPABILITIES.idol53.measurements` is deliberately empty. The ammonia channel
comes from dol-sensors' own DOL53 interface spec, not from Milesight, and
`CLAUDE.md` lists it as do-not-guess. The EM500 and EM300 sets are filled in from
the protocol reference.

---

### 4. SNR is not a 0-20 scale — it goes negative

The three units report:

| Device | RSSI | SNR | B5 verdict |
| ------ | ---- | --- | ---------- |
| EM500-CO2 | −86 | **+11** | Good |
| EM300-TH | −103 | **−21** | Unusable |
| UC501 | −104 | **−9** | Unusable |

The concept screens show SNR on a 0-20 dB scale. Two of the three real readings
are **negative**, and a 0-20 scale would clip them entirely — an installer
looking at a sensor reading −21 dB would see the same thing as one reading 0.

This is direct evidence for the open decision in PRD B5, which asks whether
20 dB is the top of a scale or whether a minimum threshold is the pass
condition. The data says a scale ceiling is the wrong model. Still Product's
call; `src/config/signal.ts` keeps it a one-line change either way.

Useful side effect: these three units span the whole verdict table, so they are
a ready-made test set for the Stage 4 signal component.

### 5. `rssi: 0, snr: 0` means "no reading", not "perfect signal"

The second UC501 was read 39 seconds after being switched on
(`systemUptime: '0:0:39'`), before it had ever joined a gateway
(`joinStatus: 0`). It reports:

```
rssi: 0, snr: 0     (and status[] carries "rssi/snr": "0/0")
```

Read naively against the PRD B5 table, **0 dBm is better than −95 dBm and would
render as "Good"** — the strongest possible verdict, on a device that has never
transmitted. That is the worst failure mode this component has: it would tell an
installer to leave a sensor that is not working.

The B5 table already has the right answer — "Disconnected … shown regardless of
signal strength" — so the Stage 4 rule must be:

1. `joinStatus === 0` → **Disconnected**, and do not evaluate RSSI at all.
2. Only when joined, apply the RSSI thresholds.

A freshly-commissioned sensor is the normal case for this app, so this path is
the common one, not an edge case. Worth an explicit test using
`uc501-868m-v3.ts`.

---

## Incidental observations from the same payload

Not acted on, recorded so they are not rediscovered later:

- `rssi: -104` puts this unit in the **Unusable** band of PRD B5 (below
  −100 dBm), and `joinStatus: 0` matches Toolbox reporting Join Status
  de-activated. Useful as a realistic test case for the Stage 4 signal verdict.
- `powerSupplyState: 2` is present, which is the field the iDOL53's 24 V supply
  row (PRD B3) will read from. Its value encoding is not yet confirmed.
- `reportingInterval: 1200` — read-only per REQ-A-12, and the payload also
  carries `globalCollectInterval: 1200`. Which of the two the Power section
  should show needs confirming.
- `classType: 2`, `joinType: 1` (OTAA), `loraVersion: 1`, `channelPlan: 0`.

### From the EM500 and EM300 reads

- **`joinStatus` is confirmed as the gateway-connection field (REQ-A-10).** The
  EM500 reports `1` and Milesight Toolbox showed it "activated"; the EM300
  reports `0` and Toolbox showed "de-activated". Cross-checked against the
  vendor app on the same units, so this mapping is established rather than
  assumed.
- **The `status[]` array is the device's own read-out list**, and it lines up
  closely with PRD B3. Each entry carries `name`, `value`, and where relevant
  `unit` and `type` — e.g.
  `{name: 'CO2 concentration', value: '497', unit: 'ppm', type: 'co2concentration'}`.
  It already contains sn, model, DevEUI, firmware/hardware revision,
  device state, join status, a combined `rssi/snr` string, every measurement,
  battery and the frame counters. Worth building the Stage 3/4 measurement rows
  on rather than re-deriving them from the scattered top-level fields.
- **The EM500 reports atmospheric pressure** (`1003.9 hPa`), alongside CO₂,
  temperature and humidity. The protocol reference flagged that pressure exists
  but is not in the concept screens; it is now confirmed present with a real
  value on hardware. The capability set currently lists three measurements per
  the concept screens — **confirm with Product whether pressure is a fourth
  row** before Stage 3 builds the Measurement section.
- **The EM300-TH is an old-protocol device.** Its IPSOv2 probe returns
  `ackError`, the SDK logs "is old protocol device", caches the result after
  82 ms and reads over the legacy path. That is the SDK's own detection working
  correctly — no tuning needed, and the "Force legacy" toggle is unnecessary
  for it. The UC501 is the opposite case and needs the IPSOv2 path.
- **Reads are much faster on these two**: 1946 ms (EM500) and 1770 ms (EM300)
  versus ~13 s on the UC501. The UC501's slow read is specific to the
  SRAM-direction quirk, not a property of the transport in general.
- `reportingInterval` differs per unit (120 / 600 / 1200 s) and is distinct from
  `globalCollectInterval` (60 / absent / 1200). `reportingInterval` is the
  REQ-A-12 field.
- `batteryVoltage` is present on the EM500 and EM300 (3592 / 3566 mV) but not on
  the UC501, which reports `powerSupplyState` instead.
- Neither sensor has `powerSupplyState`, `rs232`, `rs485`, `aiSetting` or
  `gpioSetting` — consistent with `hasExternalSupply` and `hasActiveInputConfig`
  being iDOL53-only in the capability model.

### From the second UC501

- **The "device is off" failure signature is now confirmed.** This unit was read
  once while switched off and once after being powered on through Milesight
  Toolbox. Switched off, the IPSOv2 probe still reports
  `sendData success | dataSize 9` and then fails at
  `checkReadable | transceive command error: transceive fail`; the legacy
  fallback fails the same way. Powered on, the identical sequence reaches
  `checkReadable | timeout: 1000`, falls back, and the legacy read succeeds in
  1720 ms. So a *successful write followed by a link-level transceive failure on
  the read* is the signature of an unpowered device — which matches the earlier
  diagnosis of the first unit, now with a controlled before/after on one device.
- **The two UC501s have different inputs enabled**: the older one has RS232 on
  with everything else off; this one has GPIO 1 and GPIO 2 on with RS232, RS485
  and both analog inputs off. Neither has an ADC or RS485 channel configured,
  so neither shows anything resembling an ammonia measurement path. The open
  question about how the DOL53 attaches is unchanged, and now has two
  data points that both fail to answer it.
- `loraVersion: 3` and `classType: 0` here, against `1` and `2` on the older
  unit — so these fields vary by batch and are not safe to key behaviour on.
- `oem: '0010'` on this unit against `'0000'` on the older one, mirrored in
  `subModel4`.
