import type {Region} from '../domain/device';

/**
 * Turns a desired change into the exact fields to write (roadmap task 13;
 * REQ-A-08, REQ-A-09, REQ-A-13).
 *
 * Pure. Produces either a plan or a refusal — never a partial guess.
 *
 * ─── REQ-A-09 is two different fields, not one ───
 *
 * The requirement reads: "Writing a region also writes the channel plan
 * (sub-band 1 for US915/AU915, AS923-1 for AS923/Japan). Never displayed, never
 * separately settable."
 *
 * In the device model those are **not the same field**:
 *
 * - `channelPlan` is AS923-only. The SDK types it `0 | 1 | 2 | 3` meaning
 *   AS923-1 … AS923-4, so "AS923-1" is `channelPlan: 0`. Well defined.
 * - "Sub-band 1" for US915/AU915 is a **channel mask**, not `channelPlan`.
 *   Those regions have 64+8 channels grouped into sub-bands, and selecting one
 *   means enabling its eight channels. The mask encoding for these devices is
 *   not documented in the PRD, the protocol reference or the SDK, and no
 *   US915/AU915 unit has been read.
 *
 * Writing a region without its sub-band would be **worse than not writing at
 * all**: the device would fall back to its default mask, and a gateway on
 * sub-band 1 would not hear a sensor transmitting across all 72 channels. So
 * US915 and AU915 are refused rather than half-applied. See
 * docs/stage6-write-path.md.
 *
 * ─── The settings JSON is not a flat object ───
 *
 * Found on hardware 2026-09-29: writing `{"freqRegion": 8}` reported complete
 * success — `sendCommand success: writeFlash`, the full 1030-byte image sent —
 * and changed nothing. The device still read back `freqRegion: 0`.
 *
 * The reason is in the SDK. Its own write path does not hand the settings
 * straight to the codec; it passes them through `getSettingJSON`
 * (`model/utils/migrationUtils.ts:211`), which **nests every LoRa parameter
 * under `pLoRaWANParams`** — the accumulator it builds is literally
 * `{pLoRaWANParams: {}}`, and `freqRegion` is in `LORA_PARAMS_KEYS`
 * (`model/constants.ts:2198`). A top-level `freqRegion` is simply somewhere the
 * native codec never looks, so it applies nothing and reports success, because
 * nothing went wrong. Silent no-ops are the worst possible failure for a write,
 * which is why the read-back check exists and why it earned its keep here.
 *
 * `getSettingJSON` also does one thing that is easy to miss (lines 422-434): a
 * region change **must carry `freqs` with it**. The vendor's own comment says
 * why — a change of region alone leaves `freqs` un-diffed and therefore unsent.
 * **Which** frequency list it carries is the part that bites; see
 * `REGION_DEFAULTS` below.
 */

/** `freqRegion` codes, mirroring the SDK's `FREQUENCY` enum. */
const FREQ_CODE_BY_REGION: Record<Region, number> = {
  EU868: 0,
  US915: 1,
  AU915: 2,
  CN470: 3,
  AS923: 4,
  KR920: 5,
  EU433: 7,
  IN865: 8,
  RU864: 9,
};

/** AS923-1, per `GeneralDeviceInfo.channelPlan`. */
const AS923_1 = 0;

/**
 * What a region change costs, beyond the region.
 *
 * Milesight's own app warns about this before writing a region, and the string
 * is in the SDK we ship: `setting.changeFreqRegionTip` — *"Note: Changing
 * support frequency, LoRaWAN Settings will revert to default!"*
 * (`toolbox-sdk/src/utils/translate/base.json:504`).
 *
 * "LoRaWAN Settings" is not vague there — the SDK defines the group as
 * `LoRaSettingsKeys` (`model/deviceInfo/DeviceSettings.ts:7`), and it contains
 * `applicationKey`, `applicationSessionKey`, `networkSessionKey`,
 * `deviceAddress`, `appEUI`, `classType`, `adr` and the rest. So a region change
 * can take the **AppKey** with it, and a sensor whose AppKey no longer matches
 * the network server will not join — which an installer would discover only
 * after leaving the site.
 *
 * Confirmed on hardware 2026-09-30: a region change also cleared the device
 * address, zeroed both frame counters and rebooted the sensor.
 *
 * The device firmware does this, not the app: the SDK carries the warning
 * string but no logic, so there is nothing to intercept. The only responsible
 * handling is to say so before writing, which is what the vendor does too.
 */
const REGION_RESETS_LORAWAN =
  "Changing the region resets this sensor's LoRaWAN settings to their defaults — " +
  'including the AppKey and device address. It will not re-join until it has been ' +
  'provisioned again on the network server.';

/**
 * Settings the SDK nests under `pLoRaWANParams`, mirroring `LORA_PARAMS_KEYS`
 * in `toolbox-sdk/src/model/constants.ts:2198`. Kept whole rather than trimmed
 * to the fields we write today, so adding one does not silently produce another
 * write that succeeds and does nothing.
 */
const LORA_PARAM_KEYS: ReadonlySet<string> = new Set([
  'joinType',
  'port',
  'deviceAddress',
  'freqRegion',
  'freqMode',
  'freqs',
  'enableFreqIndex',
  'regularReport',
  'alarmReport',
  'applicationKey',
  'networkSessionKey',
  'applicationSessionKey',
  'adr',
  'appEUI',
  'dataRate',
  'txPower',
  'loraVersion',
  'confirmPackages',
  'rejoinMode',
  'classType',
  'channelPlan',
  'multicast',
  'pingSlotPeriod',
  'gwSpecific',
  'window2Dr',
  'window2Freq',
  'd2dCfg',
  'singleChannelMode',
]);

/**
 * Everything a region change has to carry, mirroring the SDK's own tables:
 * `getDefaultFreqs` (`utils/util.ts:477`), `RX2_FREQ_DEFAULT`
 * (`constants.ts:218`) and `RX2_DATA_RATE_OPTIONS[...].default`
 * (`constants.ts:61`).
 *
 * ─── Why defaults and not the device's existing values ───
 *
 * Found on hardware 2026-09-30, and this one cost a sensor an afternoon. A
 * region change sent the device's *current* frequencies alongside the new
 * region, which left an EM300-TH reporting `freqRegion: 8` (IN865) while still
 * carrying 868.1/868.3/868.5 — EU868 channels, every one of them above IN865's
 * 867.0 ceiling (`getFreqLimit`, `migrationUtils.ts:56`). The vendor app then
 * refused every subsequent write with "Channel Frequency: Valid Range 865 -
 * 867", because the device was in a state its own validator rejects.
 *
 * The SDK injects `freqs` on a region change (`migrationUtils.ts:430`) on the
 * assumption that the form has already replaced them with the new region's
 * defaults. We took the injection and not the assumption. These tables are that
 * assumption made explicit.
 *
 * **RX2 is the same trap one field along**, found the same way a day later:
 * "RX2 Frequency Valid Range: 865000000 - 867000000" on a device left on IN865
 * with EU868's 869525000. The firmware derived RX2 itself on one region change
 * and not on the next, so relying on it is not an option — the vendor's form
 * sets RX2 explicitly, which is what `RX2_FREQ_DEFAULT` exists for, and so does
 * this.
 *
 * The lesson generalises, and after being caught by it twice this table is now
 * the **whole** region-scoped set rather than the fields that happened to break
 * first: channels, RX2 frequency and rate, uplink data rate, TX power, and
 * `d2dCfg`'s frequency and rate — which track RX2 (the SDK's own tip reads
 * "Same as D2D Frequency", and every device read so far had them equal).
 *
 * That matches what the vendor app does: changing its Support Frequency
 * re-populates every field on the LoRaWAN page. Nothing is lost by overwriting
 * them, because a region change resets the LoRaWAN settings regardless.
 *
 * Regions absent here — US915, AU915, CN470 — describe their channels as index
 * ranges rather than a list, and are refused rather than guessed.
 */
interface RegionDefaults {
  /** `freqs` — the channel list. `getDefaultFreqs`, `utils/util.ts:477`. */
  channels: ReadonlyArray<{value: number; enable: boolean}>;
  /** `window2Freq` — RX2, in Hz. `RX2_FREQ_DEFAULT`, `constants.ts:218`. */
  rx2FrequencyHz: number;
  /** `window2Dr` — RX2 rate. `RX2_DATA_RATE_OPTIONS[...].default`. */
  rx2DataRate: number;
  /**
   * `dataRate` — the uplink spreading factor, the vendor form's "Spreading
   * Factor" row. Its permitted set is region-scoped (`getDataRateOptions`,
   * `migrationUtils.ts:112`): DR0-5 across the EU group, DR2-5 on AS923.
   */
  dataRate: number;
  /**
   * `txPower` — an index into a per-region power table, not a dBm value
   * (`getTxPowerOptions`, `migrationUtils.ts:1402`). Index 0 is the region's
   * **maximum** permitted power and is the one entry present in every region's
   * list, so it is both the safe choice and the right commissioning default.
   */
  txPower: number;
}

const REGION_DEFAULTS: Partial<Record<Region, RegionDefaults>> = {
  EU868: {
    dataRate: 0,
    txPower: 0,
    rx2FrequencyHz: 869525000,
    rx2DataRate: 0,
    channels: [
      {value: 868.1, enable: true},
      {value: 868.3, enable: true},
      {value: 868.5, enable: true},
      {value: 867.1, enable: false},
      {value: 867.3, enable: false},
      {value: 867.5, enable: false},
      {value: 867.7, enable: false},
      {value: 867.9, enable: false},
    ],
  },
  IN865: {
    dataRate: 2,
    txPower: 0,
    rx2FrequencyHz: 866550000,
    rx2DataRate: 2,
    channels: [
      {value: 865.0625, enable: true},
      {value: 865.4025, enable: true},
      {value: 865.985, enable: true},
      {value: 865.6025, enable: false},
      {value: 866.185, enable: false},
      {value: 866.385, enable: false},
      {value: 866.585, enable: false},
      {value: 866.785, enable: false},
    ],
  },
  RU864: {
    dataRate: 0,
    txPower: 0,
    rx2FrequencyHz: 869100000,
    rx2DataRate: 0,
    channels: [
      {value: 868.9, enable: true},
      {value: 869.1, enable: true},
      {value: 869.3, enable: false},
      {value: 867.3, enable: false},
      {value: 867.5, enable: false},
      {value: 867.7, enable: false},
      {value: 867.9, enable: false},
      {value: 868.1, enable: false},
    ],
  },
  AS923: {
    dataRate: 2,
    txPower: 0,
    rx2FrequencyHz: 923200000,
    rx2DataRate: 2,
    channels: [
      {value: 923.2, enable: true},
      {value: 923.4, enable: true},
      {value: 922.2, enable: false},
      {value: 922.4, enable: false},
      {value: 922.6, enable: false},
      {value: 922.8, enable: false},
      {value: 923.0, enable: false},
      {value: 922.0, enable: false},
    ],
  },
  KR920: {
    dataRate: 0,
    txPower: 0,
    rx2FrequencyHz: 921900000,
    rx2DataRate: 0,
    channels: [
      {value: 922.1, enable: true},
      {value: 922.3, enable: true},
      {value: 922.5, enable: true},
      {value: 921.9, enable: false},
      {value: 922.7, enable: false},
      {value: 922.9, enable: false},
      {value: 923.1, enable: false},
      {value: 923.3, enable: false},
    ],
  },
  EU433: {
    dataRate: 0,
    txPower: 0,
    rx2FrequencyHz: 434665000,
    rx2DataRate: 0,
    channels: [
      {value: 433.175, enable: true},
      {value: 433.375, enable: true},
      {value: 433.575, enable: true},
      {value: 433.775, enable: false},
      {value: 434.065, enable: false},
      {value: 434.265, enable: false},
      {value: 434.465, enable: false},
      {value: 434.665, enable: false},
    ],
  },
};

/** Groups flat settings into the shape the native codec reads. */
export function toSettingsObject(
  flat: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (!LORA_PARAM_KEYS.has(key)) {
      out[key] = value;
      continue;
    }
    const lora = (out.pLoRaWANParams ?? {}) as Record<string, unknown>;
    lora[key] = value;
    out.pLoRaWANParams = lora;
  }
  return out;
}

export interface WritePlan {
  /**
   * The settings object handed to the SDK, already in its nested shape. Not a
   * flat field list — see the note above on `pLoRaWANParams`.
   */
  fields: Record<string, unknown>;
  /**
   * What the device should report afterwards, keyed by the **top-level payload
   * field names a read returns** — which are flat, and so are not the same
   * names or shape as `fields`. This is what the read-back is checked against.
   *
   * Scalars only: `unappliedFields` compares with `!==`, so an array or object
   * would always look unapplied.
   */
  expect: Record<string, unknown>;
  /** Plain-language summary for the confirmation dialog. */
  summary: string[];
  /**
   * Consequences the installer must see before confirming — things the write
   * does *besides* what was asked for. Empty for a change with no side effects.
   */
  warnings: string[];
}

export type WritePlanResult =
  | {ok: true; plan: WritePlan}
  | {ok: false; reason: string};

export interface DesiredChanges {
  region?: Region | undefined;
  /** Seconds. See {@link INTERVAL_UNIT_NOTE}. */
  reportingIntervalSeconds?: number | undefined;
}

/**
 * `reportingInterval` is in **seconds** on these devices, and that was worth
 * establishing rather than assuming — writing the wrong unit means a sensor
 * reporting sixty times too often or too rarely.
 *
 * The SDK is ambiguous on its own. It labels the field minutes
 * (`setting.reportingIntervalWithUnit`, "Reporting Interval(min)"), defaults
 * `reportIntervalUnit` to `'min'`, and force-converts only the UC500 series to
 * seconds (`model/utils/util.ts:710`) — which reads as though everything else
 * is in minutes.
 *
 * The device settled it. An EM300-TH read on 2026-09-29 reported
 * `reportingInterval: 120` with `upLinkFrameCounter: 5038` after
 * `systemUptime_new: "167:53:16"` — 167.9 hours. At 120 **seconds** that
 * predicts 167.9 x 60 / 2 = about 5037 uplinks, which is what the counter says.
 * At 120 minutes it would predict 84.
 *
 * One guard follows from this: if a payload ever carries `reportingIntervalUnit`
 * the device is declaring its own unit, the evidence above no longer applies,
 * and the write is refused rather than guessed. No device read so far has
 * carried it.
 */
const INTERVAL_UNIT_NOTE = 'seconds';

/** Bounds on a written interval, in seconds. */
const MIN_INTERVAL_SECONDS = 60;
const MAX_INTERVAL_SECONDS = 86400;

/**
 * What a reporting-interval change costs, beyond the interval.
 *
 * REQ-A-12 names the gateway as the owner of this value and puts writing it out
 * of scope: "set from the gateway by downlink". dol-sensors chose to offer it
 * anyway (2026-09-29), which is their call — but the reason the PRD gave does
 * not disappear because the decision changed, so the installer is told.
 */
const INTERVAL_MAY_BE_OVERWRITTEN =
  'The gateway also sets this interval by downlink (REQ-A-12), so a network server ' +
  'configured differently can change it back. Check the gateway if it has to stick.';

/**
 * Builds the write plan for a set of desired changes against the current state.
 *
 * Returns `{ok: false}` with a reason when a change cannot be applied safely,
 * and `{ok: true}` with an empty `fields` when nothing differs.
 */
export function planWrite(
  current: {
    region: Region | null;
    /** From the payload. Changes how many channels a region takes. */
    singleChannelMode?: boolean | undefined;
    /** From the payload. Its frequency and rate follow RX2. */
    d2dCfg?: unknown;
    reportingIntervalSeconds?: number | null;
    /** Present only if the device declares its own unit — see the note above. */
    reportingIntervalUnit?: unknown;
  },
  desired: DesiredChanges,
): WritePlanResult {
  const flat: Record<string, unknown> = {};
  const expect: Record<string, unknown> = {};
  const summary: string[] = [];
  const warnings: string[] = [];

  const region = desired.region;
  if (region !== undefined && region !== current.region) {
    if (region === 'US915' || region === 'AU915') {
      return {
        ok: false,
        reason:
          `Setting ${region} also requires writing the sub-band 1 channel mask (REQ-A-09), ` +
          'and that encoding is not documented for these devices. Writing the region alone ' +
          "would leave the sensor transmitting outside the gateway's sub-band.",
      };
    }

    const defaults = REGION_DEFAULTS[region];
    if (defaults === undefined) {
      return {
        ok: false,
        reason:
          `${region} selects its channels by index range rather than by a frequency list, ` +
          'and that encoding is not documented for these devices. Writing the region without ' +
          'valid channels leaves a sensor its own vendor app will not configure.',
      };
    }

    // A single-channel device takes a shorter list, by a per-region rule the SDK
    // applies but no device read so far has exercised. Refused rather than
    // written untested: a wrong channel count strands a sensor off its gateway.
    if (current.singleChannelMode === true) {
      return {
        ok: false,
        reason:
          'This sensor is in single-channel mode, which changes how many channels a region ' +
          'takes. That path is untested here, so the region is not written rather than ' +
          'written wrongly.',
      };
    }

    const code = FREQ_CODE_BY_REGION[region];
    flat.freqRegion = code;
    expect.freqRegion = code;

    // The **new** region's values throughout, never the old region's. This is
    // the whole region-scoped set, not the fields that happened to break first.
    flat.freqs = defaults.channels;
    flat.window2Freq = defaults.rx2FrequencyHz;
    flat.window2Dr = defaults.rx2DataRate;
    flat.dataRate = defaults.dataRate;
    flat.txPower = defaults.txPower;
    expect.window2Freq = defaults.rx2FrequencyHz;
    expect.window2Dr = defaults.rx2DataRate;

    // `dataRate` and `txPower` are written but deliberately **not verified**.
    //
    // Observed on hardware 2026-09-30: a change back to EU868 wrote
    // `dataRate: 0` (SF12-DR0) and the sensor reported 2 (SF10-DR2) — while the
    // vendor app considered the device perfectly valid. With `adr: true`, which
    // is the default and was set on that unit, the spreading factor is managed
    // adaptively rather than held at whatever was last written; the same is true
    // of transmit power once ADR is running.
    //
    // So the read-back check would fire on a write that did nothing wrong. A
    // warning that cries wolf on a good write costs more than the check gains,
    // and REQ-A-13's verification matters most for the fields nothing else
    // moves. These are still sent, so a device that does honour them gets the
    // region's defaults.

    // D2D follows RX2. Kept as the device's own object with those two fields
    // corrected, so an existing D2D setup is not flattened by the region change.
    if (isRecord(current.d2dCfg)) {
      flat.d2dCfg = {
        ...current.d2dCfg,
        freq: defaults.rx2FrequencyHz,
        dr: defaults.rx2DataRate,
      };
    }

    summary.push(`Region: ${current.region ?? 'unknown'} → ${region}`);
    warnings.push(REGION_RESETS_LORAWAN);

    // Written with the region, never shown, never separately settable.
    if (region === 'AS923') {
      flat.channelPlan = AS923_1;
      expect.channelPlan = AS923_1;
      summary.push('Channel plan: AS923-1 (written with the region)');
    }
  }

  const interval = desired.reportingIntervalSeconds;
  if (interval !== undefined && interval !== current.reportingIntervalSeconds) {
    if (current.reportingIntervalUnit !== undefined) {
      return {
        ok: false,
        reason:
          'This sensor reports its own interval unit, which no device tested so far does. ' +
          `The app assumes ${INTERVAL_UNIT_NOTE} and will not guess against a device that disagrees — ` +
          'writing the wrong unit would change the reporting rate sixty-fold.',
      };
    }

    if (
      !Number.isInteger(interval) ||
      interval < MIN_INTERVAL_SECONDS ||
      interval > MAX_INTERVAL_SECONDS
    ) {
      return {
        ok: false,
        reason:
          'A reporting interval must be a whole number of seconds between ' +
          `${MIN_INTERVAL_SECONDS} and ${MAX_INTERVAL_SECONDS}. Asked for ${interval}.`,
      };
    }

    flat.reportingInterval = interval;
    expect.reportingInterval = interval;
    summary.push(
      `Reporting interval: ${describeSeconds(
        current.reportingIntervalSeconds ?? null,
      )} → ${describeSeconds(interval)}`,
    );
    warnings.push(INTERVAL_MAY_BE_OVERWRITTEN);
  }

  return {
    ok: true,
    plan: {fields: toSettingsObject(flat), expect, summary, warnings},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An interval in words, for the confirmation dialog. */
function describeSeconds(seconds: number | null): string {
  if (seconds === null) {
    return 'unknown';
  }
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  if (seconds % 60 === 0) {
    return `${seconds / 60} min`;
  }
  return `${seconds} s`;
}

/** True when a plan would change nothing. */
export function isEmptyPlan(plan: WritePlan): boolean {
  return Object.keys(plan.fields).length === 0;
}
