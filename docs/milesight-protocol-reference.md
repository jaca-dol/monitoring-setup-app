# Milesight protocol reference (IPSO payload format)

Source: Milesight's published payload documentation (their GitHub decoder reference), as shared
by Milesight alongside the SDK. This defines the **data payload format** used once a raw
read/write is possible — it is transport-agnostic (the same encoding is used for LoRaWAN uplink/
downlink and, per the SDK's `readFlash`/`writeFlash` pattern, for NFC). It does not itself say
anything about NFC session handling, tag technology, or the write-commit ordering your team
already has working knowledge of from SmartAdjust's own protocol — those remain your own
research/hardware questions, not something this reference answers.

## Payload structure

Every payload is a sequence of `(ID, TYPE, DATA)` triples, back to back:

```
+--------+--------+---------+--------+--------+---------+
|   ID   |  TYPE  |  DATA   |   ID   |  TYPE  |  DATA   |  ...
+--------+--------+---------+--------+--------+---------+
| 1 Byte | 1 Byte | N Bytes | 1 Byte | 1 Byte | N Bytes |
+--------+--------+---------+--------+--------+---------+
```

A decoder walks the byte stream, reads one `(ID, TYPE)` pair at a time, looks up the expected
length for that pair from the tables below, and consumes that many data bytes before moving to
the next triple. `ID = 0xFF` is reserved for device attributes (identity, firmware, status);
other IDs are per-device telemetry channels.

---

## UC501 (used by the iDOL53 Ammonia, via its Milesight controller)

### Attributes (ID 0xFF)

| Channel | ID | Type | Length | Description |
|---|---|---|---|---|
| IPSO | 0xFF | 0x01 | 1 | `ipso_version` |
| Hardware | 0xFF | 0x09 | 2 | `hardware_version`, e.g. `0110` → v1.1 |
| Firmware | 0xFF | 0x0A | 2 | `firmware_version`, e.g. `0110` → v1.10 |
| TSL | 0xFF | 0xFF | 2 | `tsl_version` |
| Serial Number | 0xFF | 0x16 | 2 | `sn` (8B per spec) |
| LoRaWAN Class | 0xFF | 0x0F | 1 | 0: A, 1: B, 2: C, 3: CtoB |
| Reset Event | 0xFF | 0xFE | 1 | `reset_event` |
| Device Status | 0xFF | 0x0B | 1 | `device_status` — this is the on/off channel (matches the `{device_status: 1}` / `{device_status: 0}` calls Claude Code found) |

### Telemetry

| Channel | ID | Type | Length | Description |
|---|---|---|---|---|
| Battery | 0x01 | 0x75 | 1 | unit: % |
| GPIO 1 (digital input) | 0x03 | 0x00 | 1 | 0: low, 1: high |
| GPIO 2 (digital input) | 0x04 | 0x00 | 1 | 0: low, 1: high |
| GPIO 1 (digital output) | 0x03 | 0x01 | 1 | 0: low, 1: high |
| GPIO 2 (digital output) | 0x04 | 0x01 | 1 | 0: low, 1: high |
| GPIO 1 (counter) | 0x03 | 0xC8 | 4 | `gpio_counter_1` |
| GPIO 2 (counter) | 0x04 | 0xC8 | 4 | `gpio_counter_2` |
| Analog Input Type | 0xFF | 0x14 | 1 | `adc_id` (bits 7–4) + `adc_id_type` (bits 3–0): 0 current, 1 voltage |
| ADC 1 (v2) | 0x05 | 0x02 | 8 | `adc_1` + min + max + avg (2B each), int16/1000 |
| ADC 2 (v2) | 0x06 | 0x02 | 8 | `adc_2` + min + max + avg (2B each), int16/1000 |
| ADC 1 (v3) | 0x05 | 0xE2 | 8 | `adc_1` + min + max + avg (2B each), float16 |
| ADC 2 (v3) | 0x06 | 0xE2 | 8 | `adc_2` + min + max + avg (2B each), float16 |
| SDI-12 (v3) | 0x08 | 0xDB | 37 | `channel_id`(1B) + `channel_data`(36B) |
| RS485 | 0xFF | 0x0E | N | `channel_id`(1B) + `channel_def`(1B) + `data`(MB) — `channel_def` = modbus_type(bits 0-2) + data_length(bits 3-7); modbus_type: 0 COIL, 1 DIS, 2 REG INPUT, 3 REG HOLD INT16, 4 REG HOLD INT32, 5 REG HOLD FLOAT, 6 REG INPUT INT32, 7 REG INPUT FLOAT |
| RS485 Fault | 0xFF | 0x15 | 1 | `modbus_chn_id_alarm` |
| ADC 1 Alarm | 0x85 | 0xE2 | 9 | as ADC1 v3 + `adc_1_alarm`(1B): 0 threshold, 1 value change |
| ADC 2 Alarm | 0x86 | 0xE2 | 9 | as ADC2 v3 + `adc_2_alarm`(1B) |
| RS485 Alarm | 0x80 | 0x0E | N | as RS485 + `modbus_chn_id_alarm`(1B) |
| Sensor History | 0x20 | 0xDC | 22 | timestamp(4B) + gpio_1_type(1B) + gpio_1_data(4B) + gpio_2_type(1B) + gpio_2_data(4B) + ai_1_data(4B) + ai_2_data(4B) |
| Modbus History | 0x20 | 0xDD | N | timestamp(4B) + modbus_mask(2B) + modbus_data(M×5B) |
| SDI-12 History | 0x20 | 0xE0 | N | timestamp(4B) + sdi_mask(2B) + sdi_data(M×36B) |

**Ammonia channel mapping — resolve from dol-sensors' own DOL53 interface spec, not from
Milesight.** The UC501 is a generic multi-interface controller; the DOL53 ammonia sensor is
dol-sensors' own hardware, wired into it. There is no channel above named for ammonia
specifically because the UC501 doesn't know what's attached — the decoder needs to match
whatever output interface the DOL53 was designed with:
- an **ADC channel** (0x05 or 0x06; current or voltage type per the Analog Input Type byte,
  0xFF/0x14) if the DOL53 outputs 4–20 mA or voltage analog, or
- an **RS485** (0xFF/0x0E, with its `modbus_type`/register map) or **SDI-12** (0x08/0xDB)
  channel if it's a digital/bus-connected probe.

This is answerable from the DOL53's own interface/wiring documentation (whoever designed the
DOL53↔UC501 pairing at dol-sensors will know this) — not a question for Milesight, and not
blocked on their SDK. Get the specific interface and, if analog, the mA/voltage range and
scaling formula for ammonia ppm, before writing the iDOL53 measurement decoder.

---

## EM300-TH (temperature & humidity)

### Attributes (ID 0xFF)
Same attribute table as UC501 above (IPSO version, hardware/firmware version, TSL, serial
number, LoRaWAN class, reset event, device status) — identical IDs and types.

### Telemetry

| Channel | ID | Type | Length | Description |
|---|---|---|---|---|
| Battery | 0x01 | 0x75 | 1 | unit: % |
| Temperature | 0x03 | 0x67 | 2 | unit: °C |
| Humidity | 0x04 | 0x68 | 1 | unit: %r.h. |
| Historical Data | 0x20 | 0xCE | 8 | timestamp(4B) + temperature(2B) + humidity(1B) + reserved(1B) |

This is the simplest of the three — matches the PRD's two-value measurement card and static
EU868 region (no region drop-down needed on this device).

---

## EM500-CO2 (the EM500-CO2-T-H in the PRD)

### Attributes (ID 0xFF)
Same attribute table as above.

### Telemetry

| Channel | ID | Type | Length | Description |
|---|---|---|---|---|
| Battery | 0x01 | 0x75 | 1 | unit: % |
| Temperature | 0x03 | 0x67 | 2 | unit: °C |
| Humidity | 0x04 | 0x68 | 1 | unit: %r.h. |
| CO2 | 0x05 | 0x7D | 2 | unit: ppm |
| Pressure | 0x06 | 0x73 | 2 | unit: hPa |
| Temperature Alarm | 0x83 | 0xD7 | 5 | temperature(2B) + temperature_change(2B) + temperature_alarm(1B) |
| Historical Data | 0x20 | 0xCE | 11 | timestamp(4B) + co2(2B) + pressure(2B) + temperature(2B) + humidity(1B) |

This device is a good match for the PRD's three-value measurement card (temperature, humidity,
CO2) — pressure is available too but isn't currently called out in the concept screens; worth
a quick check with Product on whether it should be shown.

---

## Notes for the codec layer

- `device_status` (0xFF/0x0B) is the shared on/off channel across all three devices — one
  function should cover power toggling for all of them.
- `reset_event` (0xFF/0xFE) is the reboot channel, also shared.
- The read pattern is: read the full attribute + telemetry set in one pass (matches REQ-A-06 —
  "one operation" — nicely, since this is already how the payload format batches multiple
  channels per read).
- The write pattern (`readFlash` → merge changed fields → `writeFlash`) means writes should
  always be built from a freshly-read full state, not from assumed defaults, so a partial local
  model never gets written back and clobbers fields the app didn't intend to touch. (Note: an
  earlier version of this doc attributed this to "REQ-A-13" — that was wrong. REQ-A-13 is
  referenced in the PRD's section-content table only in connection with "active configuration,"
  and is missing from the requirements table entirely — see the doc gap noted in
  PRD-WIRELESS-US-001-B.md. The atomic-apply expectation itself is real (from the original
  SmartAdjust framework-research brief), just not tied to that requirement ID.)
