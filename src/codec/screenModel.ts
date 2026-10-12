import {EU_BAND_LABEL, RESTRICT_868M_TO_SINGLE_REGION} from '../config/network';
import {CAPABILITIES, type Region} from '../domain/device';
import type {
  AppKeyStatus,
  DeviceScreenModel,
  ExternalSupplyState,
  PowerState,
} from '../domain/screen';

import {describeInputConfig, identifyDevice} from './deviceIdentity';
import {extractMeasurements, readDeviceTime} from './measurements';
import {readingOrNull, signalVerdict} from './signalVerdict';

/**
 * Turns a stripped `readFlash()` payload into the screen model (roadmap
 * tasks 6–11).
 *
 * Pure: no NFC, no React, no I/O. The transport layer has already removed key
 * material before anything reaches here, so this cannot leak what it never
 * receives (REQ-A-15) — it is told only *which* key fields were present.
 */

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * `deviceState` is the on/off channel (`0xFF/0x0B` in the protocol reference).
 * Anything other than a clean 0 or 1 is reported as unknown rather than guessed
 * — the Control section shows a plain row instead of a toggle in that case.
 */
function readPowerState(payload: Record<string, unknown>): PowerState {
  switch (asNumber(payload.deviceState)) {
    case 1:
      return 'on';
    case 0:
      return 'off';
    default:
      return 'unknown';
  }
}

/**
 * `powerSupplyState` appears only on the UC50X. Its encoding is not documented
 * anywhere in the source materials; both units read so far report `2` while
 * mains-powered, so 2 is treated as present and 0 as absent, and anything else
 * is reported as unknown rather than asserted.
 *
 * **Open item** — confirm the encoding before the Power section is trusted in
 * the field. See docs/stage4-read-path.md.
 */
function readExternalSupply(
  payload: Record<string, unknown>,
  hasExternalSupply: boolean,
): ExternalSupplyState | null {
  if (!hasExternalSupply) {
    return null;
  }
  switch (asNumber(payload.powerSupplyState)) {
    case 2:
      return 'present';
    case 0:
      return 'absent';
    default:
      return 'unknown';
  }
}

/**
 * REQ-A-10: connection is "does it reach the gateway", not LoRaWAN join state.
 *
 * `joinStatus` is the only field that speaks to this, and it was cross-checked
 * against Milesight Toolbox on real units: `1` showed "activated", `0` showed
 * "de-activated". The naming is the vendor's; the meaning we present is the
 * requirement's.
 */
function readConnection(payload: Record<string, unknown>): {
  connected: boolean;
} {
  return {connected: asNumber(payload.joinStatus) === 1};
}

/**
 * AppKey status without ever touching a value.
 *
 * The transport layer reports which key fields it stripped, so presence is
 * known here while the value is not — which is the whole point (REQ-A-15).
 */
function readAppKeyStatus(removedSecrets: readonly string[]): AppKeyStatus {
  if (removedSecrets.length === 0) {
    return 'unknown';
  }
  return removedSecrets.includes('applicationKey') ? 'verified' : 'missing';
}

/**
 * Regions the drop-down may offer.
 *
 * Applies the open REQ-A-08 policy from `src/config/network.ts`: by default an
 * "-868M" device is pinned to its current region, matching the PRD and the
 * concept screens, even though the hardware reports three.
 */
function selectableRegions(
  bandLabel: string,
  supported: readonly Region[],
  current: Region | null,
): {regions: Region[]; fixed: boolean} {
  if (RESTRICT_868M_TO_SINGLE_REGION && bandLabel === EU_BAND_LABEL) {
    const pinned = current ?? supported[0] ?? null;
    return {regions: pinned === null ? [] : [pinned], fixed: true};
  }
  return {regions: [...supported], fixed: supported.length <= 1};
}

/** Battery sub-label wording, which PRD B3 makes device-type dependent. */
function batterySublabel(hasExternalSupply: boolean): string {
  return hasExternalSupply
    ? 'Not the service life'
    : 'Service life depends on reporting interval';
}

export interface BuildScreenModelInput {
  payload: Record<string, unknown>;
  /** Key fields the transport layer stripped, from `ProbeReadResult`. */
  removedSecrets: readonly string[];
}

export function buildScreenModel({
  payload,
  removedSecrets,
}: BuildScreenModelInput): DeviceScreenModel | null {
  const identity = identifyDevice(payload);
  if (identity.typeId === null) {
    return null;
  }

  const capabilities = CAPABILITIES[identity.typeId];
  const inputs = describeInputConfig(payload);
  const {connected} = readConnection(payload);

  const rssi = readingOrNull(asNumber(payload.rssi), connected);
  const snr = readingOrNull(asNumber(payload.snr), connected);
  const connection = connected ? 'connected' : 'disconnected';

  const {regions, fixed} = selectableRegions(
    identity.bandLabel,
    identity.supportedRegions,
    identity.currentRegion,
  );

  return {
    capabilities,
    control: {powerState: readPowerState(payload)},
    measurement: {
      readings: extractMeasurements(payload, capabilities.measurements),
      readAt: readDeviceTime(payload),
    },
    device: {
      identity,
      activeInputs: inputs,
      configurationLabel:
        capabilities.hasActiveInputConfig && inputs.length > 0
          ? `${identity.displayName} · ${inputs.join(', ')}`
          : null,
      // No qualified-revision list exists in any source material yet, so this
      // stays honest rather than asserting a verdict it cannot support.
      revisionVerdict: 'unknown',
      appKey: readAppKeyStatus(removedSecrets),
    },
    network: {
      connection,
      connectionDetail: null,
      signal: {verdict: signalVerdict(connection, rssi), rssi, snr},
      region: identity.currentRegion,
      selectableRegions: regions,
      regionIsFixed: fixed,
    },
    power: {
      batteryPercent: asNumber(payload.battery),
      batterySublabel: batterySublabel(capabilities.hasExternalSupply),
      externalSupply: readExternalSupply(
        payload,
        capabilities.hasExternalSupply,
      ),
      reportingIntervalSeconds: asNumber(payload.reportingInterval),
      reportingIntervalSource: 'Set from the gateway',
    },
  };
}

/** Exported for tests that need the raw sub-readers. */
export const internals = {
  readPowerState,
  readExternalSupply,
  readConnection,
  readAppKeyStatus,
  selectableRegions,
  asRecord,
};
