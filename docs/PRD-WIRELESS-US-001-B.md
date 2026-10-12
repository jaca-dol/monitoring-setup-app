# PRD-WIRELESS-US-001-B — dol-sensors monitoring setup

Version 2.0 — replaces the SmartAdjust annex. Part of the Wireless US Project document set.
See PRD-WIRELESS-US-001 for scope, decisions and the master product table.

## B1 Purpose and scope

The Milesight devices are commissioned over NFC by a dedicated dol-sensors app rather than by
extending SmartAdjust. The two apps coexist: SmartAdjust continues to serve the existing wired
dol-sensors sensors, and this app serves the wireless products. "dol-sensors monitoring setup"
is a working title and is not the released name.

**Devices in scope:**
- iDOL53 Ammonia — the DOL53 sensor with a UC501 and PSU, sold as one article.
- Milesight EM500-CO2-T-H.
- Milesight EM300-TH.

**Out of scope:**
- The standalone UC501 RS232 converter (sold to one customer only).
- Analog and pulse configuration on the UC501, until the LoRa Enabler variant is introduced.
- The iDOL139 (no NFC interface) and the iDOL90 (configured by its supplier).
- Firmware updating — done with the supplier NFC app, to keep the security-update route with the manufacturer.
- Writing the reporting interval — set from the gateway by downlink.

Three decisions shape the screens, stated once here: the app opens on the last value the sensor
measured; the reporting interval is read only; the channel plan is written with the region and
never shown to the user.

## B2 Requirements

| ID | Requirement | Pri. |
|---|---|---|
| REQ-A-01 | Support the iDOL53 Ammonia, EM500-CO2-T-H and EM300-TH over NFC, in both band groups where the product has them. | Must |
| REQ-A-02 | Identify device type and band group automatically; present only the functions/regions that device supports. | Must |
| REQ-A-03 | Handle the device access password set in supplier production without exposing it to the user. | Must |
| REQ-A-04 | Show the hardware and firmware revision. | Must |
| REQ-A-05 | Turn the device on/off and reboot it. Power is a state, reboot is an action; both reachable before any reading is taken. | Must |
| REQ-A-06 | Read all B3 values in one operation, presented on one screen. | Must |
| REQ-A-07 | Display the last measured value(s) with the time read. Multi-parameter sensors show all parameters. | Must |
| REQ-A-08 | Region selected from a drop-down scoped to the device's band group. "-868M" devices show static EU868 text, no control. | Must |
| REQ-A-09 | Writing a region also writes the channel plan (sub-band 1 for US915/AU915, AS923-1 for AS923/Japan). Never displayed, never separately settable. | Must |
| REQ-A-10 | Connection state shown as reaches-the-gateway (connected/disconnected), not LoRaWAN join state. | Must |
| REQ-A-11 | Signal shown as a verdict with values and limits beneath it, per B5. | Must |
| REQ-A-12 | Reporting interval read only, shown with its source (the gateway). Not offered to write. | Must |
| REQ-A-13 | **Missing from the source PRD.** Referenced in the B4 section-content table only, in connection with "active input configuration" on devices that have one (the iDOL53) — never defined here. Flag to Martin/Product for a real definition; don't guess its scope in code. |  |
| REQ-A-14 | Same section order on every device type — control, measurement, device, network, power — showing only applicable rows. | Must |
| REQ-A-15 | AppKeys never displayed, extractable, logged, or exported. | Must |
| REQ-A-16 | All functions work offline — no gateway, mobile data, or cloud. | Must |
| REQ-A-17 | Save to profile / share settings, matching SmartAdjust's existing behavior. | TBD |
| REQ-A-18 | State supported platforms/min OS versions; check NFC hardware at startup with a clear message on unsupported handsets. | Must |
| REQ-A-19 | Published under the dol-sensors name; installs and runs alongside SmartAdjust on the same phone without conflict. | Must |

## B3 Read-out fields (read in one operation, REQ-A-06)

- Last measured value(s), with time of reading (REQ-A-07).
- Device type and band group.
- Firmware and hardware revision, with qualified-revision verdict (REQ-A-04).
- DevEUI.
- Active input configuration (iDOL53 only).
- Region (REQ-A-08) — not the channel plan, not the enabled channels.
- Gateway connection state (REQ-A-10).
- Signal, per B5 (REQ-A-11).
- Battery level. On iDOL53, the 24V supply state is shown above it, battery labelled as backup
  (a mains-powered unit reading high battery % isn't necessarily healthy).
- Reporting interval, read only, with source named (REQ-A-12).

## B4 Screen structure

One screen per sensor type, same section order on every type (REQ-A-14):
Control → Measurement → Device → Network → Power → Actions.

| Section | Content |
|---|---|
| Control | Power on/off toggle, reboot button. First — an off device has nothing to read (REQ-A-05). |
| Measurement | Last value(s) with time read. One value or a row of values depending on parameter count (REQ-A-07). |
| Device | Type, band group, active config (where applicable), firmware/hardware revision, DevEUI (REQ-A-04, REQ-A-13). |
| Network | Region drop-down, gateway connection state, signal with limits (REQ-A-08, A-10, A-11). |
| Power | Battery level (supply state above it on iDOL53), read-only reporting interval (REQ-A-12). |
| Actions | Save to profile, share settings, then the "Apply sensor settings" NFC bar (REQ-A-17). |

## B5 Signal and connection

The installer needs a verdict (move it / don't), not raw numbers. Values and limits shown
beneath the verdict.

| Verdict | Condition | Meaning |
|---|---|---|
| Good | RSSI better than −95 dBm | Leave it where it is. |
| Weak | RSSI −95 to −100 dBm | Works, little margin — move if mounting allows. |
| Unusable | RSSI below −100 dBm | Move the sensor or add a gateway. Don't leave the site. |
| Disconnected | No uplink has reached the gateway | Shown regardless of signal strength. |

The −100 dBm limit is shown as "usable above −100 dBm."

**Open decision:** the concept screens show a 0–20 dB SNR scale, but on LoRaWAN a *higher* SNR
is better and the useful number is a minimum threshold, not a scale ceiling. Decide before
building this component: is 20 dB the top of the scale, or should a minimum SNR be the pass
condition?

## B6 Release-blocking actions

| Action | Owner | Needed by |
|---|---|---|
| Obtain the NFC protocol spec/SDK from Milesight (REQ-A-01 to A-13 assume this). | Sourcing/Product | Before app dev start |
| Confirm each device exposes its latest measured value over NFC — EM500/EM300 expected to; the UC501-read ammonia value is the one to verify. | Product/Firmware | Before app dev start |
| Decide the released app name; check against app stores and dol-sensors trademarks. | Product/Marketing | Before store submission |
| Decide the SNR presentation in B5. | Product | Before app dev start |
