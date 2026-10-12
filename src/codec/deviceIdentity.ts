import type {DeviceIdentity, DeviceTypeId, Region} from '../domain/device';
import {DISPLAY_NAMES} from '../domain/device';

/**
 * Turns a `readFlash()` payload into a device identity (REQ-A-02).
 *
 * Pure functions only — no NFC, no React, no I/O — so every branch is testable
 * against the captured fixture in `__tests__/fixtures/`.
 *
 * Everything here is defensive about shape. The payload is vendor JSON parsed
 * at runtime; a missing or renamed field must degrade to "unknown", never
 * throw, because a read that half-works is more useful in the field than a
 * crash.
 */

/**
 * `freqRegion` → region, mirroring the SDK's `FREQUENCY` enum
 * (`model/constants.ts`). Note the enum reuses 1 and 2 for the CN470 variants;
 * only the primary meanings are mapped here.
 */
const REGION_BY_FREQ_CODE: Record<number, Region> = {
  0: 'EU868',
  1: 'US915',
  2: 'AU915',
  3: 'CN470',
  4: 'AS923',
  5: 'KR920',
  7: 'EU433',
  8: 'IN865',
  9: 'RU864',
};

/**
 * `supportFreq` → the regions that hardware accepts, mirroring the SDK's
 * `SUPPORTED_FREQUENCY_OPTIONS`. This is the band group of REQ-A-02/A-08.
 */
const REGIONS_BY_SUPPORT_CODE: Record<number, Region[]> = {
  1: ['EU433'],
  2: ['CN470'],
  3: ['EU868', 'IN865', 'RU864'],
  4: ['US915', 'AU915', 'AS923', 'KR920'],
  5: ['EU868', 'IN865', 'RU864', 'US915', 'AU915', 'AS923', 'KR920'],
};

/**
 * Base model → article.
 *
 * `UC501 → idol53` is a **product convention, not a hardware fact**. The iDOL53
 * is a UC501 paired with dol-sensors' own DOL53 sensor and a PSU, sold as one
 * article (PRD B1), and the controller cannot report what is wired to it. A
 * bare UC501 and an assembled iDOL53 are indistinguishable over NFC.
 *
 * PRD B1 also puts the standalone UC501 RS232 converter explicitly out of
 * scope, and that unit is likewise indistinguishable here. See
 * `describeInputConfig()`.
 */
const TYPE_BY_MODEL_KEY: Record<string, DeviceTypeId> = {
  UC501: 'idol53',
  'EM500-CO2': 'em500-co2-t-h',
  'EM300-TH': 'em300-th',
  'EM300-DI': 'em300-di',
};

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * A band suffix: three digits and an `M`, e.g. `868M`, `915M`, `470M`.
 *
 * `deviceInformation` does not put the band in a fixed slot. Four real units
 * give three different shapes:
 *
 *   UC501-868M     → {subModel1: '868M', subModel2: '0000', subModel4: '0000'}
 *   UC501-868M     → {subModel1: '868M', subModel2: '0000', subModel4: '0010'}
 *   EM500-CO2-868M → {subModel1: 'CO2',  subModel2: '868M'}
 *   EM300-TH-868M  → {subModel1: 'TH',   subModel2: '868M'}
 *
 * So the band is whichever slot looks like a band, and the variant — when there
 * is one — is in `subModel1`.
 */
const BAND_PATTERN = /^\d{3}M$/;

/**
 * A product variant must contain a letter.
 *
 * The second UC501 tested carries `subModel4: '0010'`, matching its `oem`
 * field — a numeric OEM code, not a variant. Treating any non-band sub-model as
 * a variant produced the article key `UC501-0010`, which matches nothing, so
 * that unit identified as UNSUPPORTED. Requiring a letter keeps `CO2`, `TH` and
 * `PT100` while rejecting `0010` and `0000`.
 */
const VARIANT_PATTERN = /[A-Za-z]/;

/** Sub-model slots carry `'0000'` or `''` when unused. */
function isMeaningfulSubModel(value: string): boolean {
  return value !== '' && value !== '0000';
}

function looksLikeVariant(value: string): boolean {
  return (
    isMeaningfulSubModel(value) &&
    !BAND_PATTERN.test(value) &&
    VARIANT_PATTERN.test(value)
  );
}

export interface ModelParts {
  /** Raw model string as reported, e.g. `EM500-CO2-868M`. */
  model: string;
  /** Vendor base model, e.g. `EM500`. */
  baseModel: string;
  /** Product variant, e.g. `CO2` or `TH`. Empty when there is none. */
  variant: string;
  /** Band suffix, e.g. `868M`. Empty when not identifiable. */
  bandLabel: string;
  /** Base model plus variant — the article key, e.g. `EM500-CO2`. */
  typeKey: string;
}

function buildParts(
  model: string,
  baseModel: string,
  variant: string,
  bandLabel: string,
): ModelParts {
  return {
    model,
    baseModel,
    variant,
    bandLabel,
    typeKey: variant ? `${baseModel}-${variant}` : baseModel,
  };
}

/**
 * Splits a model into base model, variant and band.
 *
 * Prefers the structured `deviceInformation` block when present, since it does
 * not rely on parsing a display string; falls back to splitting `model` on
 * dashes, treating a trailing band-shaped segment as the band.
 */
export function splitModel(payload: Record<string, unknown>): ModelParts {
  const model = asString(payload.model);
  const info = asRecord(payload.deviceInformation);
  const infoModel = asString(info.model);

  if (infoModel) {
    const subModels = [
      info.subModel1,
      info.subModel2,
      info.subModel3,
      info.subModel4,
    ]
      .map(asString)
      .filter(isMeaningfulSubModel);

    const bandLabel = subModels.find(s => BAND_PATTERN.test(s)) ?? '';
    // Only subModel1 has ever carried a variant; later slots hold OEM codes.
    const first = asString(info.subModel1);
    const variant = looksLikeVariant(first) ? first : '';

    return buildParts(model || infoModel, infoModel, variant, bandLabel);
  }

  const parts = model.split('-').filter(Boolean);
  if (parts.length === 0) {
    return buildParts(model, model, '', '');
  }

  const last = parts[parts.length - 1] ?? '';
  const hasBand = BAND_PATTERN.test(last);
  const bandLabel = hasBand ? last : '';
  const rest = hasBand ? parts.slice(0, -1) : parts;

  return buildParts(model, rest[0] ?? '', rest.slice(1).join('-'), bandLabel);
}

export function regionFromCode(code: number | null): Region | null {
  return code === null ? null : REGION_BY_FREQ_CODE[code] ?? null;
}

export function supportedRegionsFromCode(code: number | null): Region[] {
  return code === null ? [] : REGIONS_BY_SUPPORT_CODE[code] ?? [];
}

export function identifyDevice(
  payload: Record<string, unknown>,
): DeviceIdentity {
  const {model, baseModel, bandLabel, typeKey} = splitModel(payload);
  const typeId = TYPE_BY_MODEL_KEY[typeKey.toUpperCase()] ?? null;
  const supportedRegions = supportedRegionsFromCode(
    asNumber(payload.supportFreq),
  );

  return {
    typeId,
    displayName: typeId ? DISPLAY_NAMES[typeId] : model || 'Unsupported device',
    model,
    baseModel,
    bandLabel,
    supportedRegions,
    currentRegion: regionFromCode(asNumber(payload.freqRegion)),
    regionIsFixed: supportedRegions.length <= 1,
    firmwareVersion: asString(payload.firmwareVersion),
    hardwareVersion: asString(payload.hardwareVersion),
    devEui: asString(payload.deviceEui),
    serialNumber: asString(payload.sn),
  };
}

/** Which physical input the UC501 currently has enabled (PRD B3, iDOL53 only). */
export type ActiveInput = 'rs232' | 'rs485' | 'ai1' | 'ai2' | 'gpio1' | 'gpio2';

function isEnabled(value: unknown): boolean {
  return asRecord(value).enable === true;
}

/**
 * Lists the enabled interfaces on a UC50X payload.
 *
 * This is the "active input configuration" row of PRD B3, and it is also the
 * only signal available for telling the in-scope iDOL53 apart from the
 * out-of-scope standalone RS232 converter — though it is not a reliable one,
 * since both are UC501s and either could be configured either way.
 */
export function describeInputConfig(
  payload: Record<string, unknown>,
): ActiveInput[] {
  const gpio = asRecord(payload.gpioSetting);
  const ai = asRecord(payload.aiSetting);

  const active: ActiveInput[] = [];
  if (isEnabled(payload.rs232)) {
    active.push('rs232');
  }
  if (isEnabled(payload.rs485)) {
    active.push('rs485');
  }
  if (isEnabled(ai.ai1)) {
    active.push('ai1');
  }
  if (isEnabled(ai.ai2)) {
    active.push('ai2');
  }
  if (isEnabled(gpio.gpio1)) {
    active.push('gpio1');
  }
  if (isEnabled(gpio.gpio2)) {
    active.push('gpio2');
  }
  return active;
}
