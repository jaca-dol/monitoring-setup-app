/**
 * Device identity, band group and capability set (REQ-A-02).
 *
 * Leaf layer: imports nothing from transport, codec or ui, so both the codec
 * and the UI can depend on it without creating a cycle. Pure data and types.
 */

/**
 * The articles this app supports.
 *
 * The first three are PRD B1's scope. **`em300-di` is an addition beyond the
 * PRD**, added 2026-09-28 after a physical EM300-DI-868M arrived — the PRD's
 * device list has not been updated to include it.
 */
export type DeviceTypeId = 'idol53' | 'em500-co2-t-h' | 'em300-th' | 'em300-di';

/**
 * LoRaWAN regions, named as the SDK's `FREQUENCY` enum names them so the two
 * can be compared without a translation table.
 */
export type Region =
  | 'EU868'
  | 'US915'
  | 'AU915'
  | 'CN470'
  | 'AS923'
  | 'KR920'
  | 'EU433'
  | 'IN865'
  | 'RU864';

/** Whether the gateway has heard from the device (REQ-A-10). */
export type ConnectionState = 'connected' | 'disconnected';

export interface MeasurementCapability {
  /** Stable key, used by the UI to pick a row. */
  key: string;
  label: string;
  unit: string;
  /**
   * Matched against `status[].name` for a channel the device reports **without**
   * a `type`.
   *
   * Typed entries are the norm and are matched by type. The EM300-DI's digital
   * input is not: it reports `diLevel` and `diCount` as plain named entries,
   * because the device does not consider them IPSO measurements. They are still
   * the reason that device exists, so they are read by name instead of dropped.
   */
  statusName?: string | undefined;
  /**
   * Rendering for a boolean channel, as `[whenFalse, whenTrue]`.
   *
   * A digital input reports a boolean, and "false" is not something to show an
   * installer. These labels restate the field rather than interpreting it —
   * naming a level, not asserting what the wiring means by it.
   */
  booleanLabels?: readonly [string, string] | undefined;
}

/**
 * What a device type can do. Drives REQ-A-02's "present only the functions
 * that device supports" and REQ-A-14's "showing only applicable rows".
 */
export interface DeviceCapabilities {
  measurements: MeasurementCapability[];
  /** iDOL53 shows 24 V supply state above the battery row (PRD B3). */
  hasExternalSupply: boolean;
  /** iDOL53 is the only type with a user-visible active input config (PRD B4). */
  hasActiveInputConfig: boolean;
}

export interface DeviceIdentity {
  /** null when the payload is a device we do not support (REQ-A-01). */
  typeId: DeviceTypeId | null;
  /** Human label for the Device section. */
  displayName: string;
  /** Raw model string as reported, e.g. `UC501-868M`. */
  model: string;
  /** Model without the band suffix, e.g. `UC501`. */
  baseModel: string;
  /** Band suffix as reported, e.g. `868M`. Empty when absent. */
  bandLabel: string;
  /** Regions this hardware can be set to. Empty when unknown. */
  supportedRegions: Region[];
  /** Region currently written to the device, when it could be read. */
  currentRegion: Region | null;
  /**
   * True when there is nothing to choose — REQ-A-08 says such devices show
   * static text and no control.
   */
  regionIsFixed: boolean;
  firmwareVersion: string;
  hardwareVersion: string;
  devEui: string;
  serialNumber: string;
}

const NO_MEASUREMENTS: MeasurementCapability[] = [];

/**
 * Capability sets per device type.
 *
 * The iDOL53's measurement list is deliberately empty. Its ammonia channel
 * cannot be derived from the UC501 payload — the controller does not know what
 * is wired to it, and the right channel comes from dol-sensors' own DOL53
 * interface spec. `CLAUDE.md` lists this as a do-not-guess item, so this stays
 * empty until that spec lands rather than being filled in speculatively.
 */
export const CAPABILITIES: Record<DeviceTypeId, DeviceCapabilities> = {
  idol53: {
    measurements: NO_MEASUREMENTS,
    hasExternalSupply: true,
    hasActiveInputConfig: true,
  },
  'em500-co2-t-h': {
    // Pressure is a fourth row by product decision (2026-09-17). The concept
    // screens showed three values, but the hardware returns atmospheric
    // pressure alongside them (confirmed: 1003.9 hPa on a real unit), and it is
    // cheaper to show it now and drop it later than to discover it is wanted
    // after the Measurement section is built.
    measurements: [
      {key: 'temperature', label: 'Temperature', unit: '°C'},
      {key: 'humidity', label: 'Humidity', unit: '%r.h.'},
      {key: 'co2', label: 'CO₂', unit: 'ppm'},
      {key: 'pressure', label: 'Pressure', unit: 'hPa'},
    ],
    hasExternalSupply: false,
    hasActiveInputConfig: false,
  },
  'em300-th': {
    measurements: [
      {key: 'temperature', label: 'Temperature', unit: '°C'},
      {key: 'humidity', label: 'Humidity', unit: '%r.h.'},
    ],
    hasExternalSupply: false,
    hasActiveInputConfig: false,
  },
  // Same enclosure and sensing as the EM300-TH, plus a digital input. Read from
  // a physical unit 2026-09-28: temperature 25.7 ℃, humidity 47.0 %,
  // diLevel false, diCount 16.
  'em300-di': {
    measurements: [
      {key: 'temperature', label: 'Temperature', unit: '°C'},
      {key: 'humidity', label: 'Humidity', unit: '%r.h.'},
      {
        key: 'diLevel',
        label: 'Input',
        unit: '',
        statusName: 'diLevel',
        booleanLabels: ['Low', 'High'],
      },
      {key: 'diCount', label: 'Pulses', unit: '', statusName: 'diCount'},
    ],
    hasExternalSupply: false,
    hasActiveInputConfig: false,
  },
};

/**
 * Where the NFC tag sits on a device, shown once a read has identified it, so
 * the next tap does not have to be a guess.
 *
 * `artworkKey` is a key, not an image: this layer stays free of bundler and
 * React Native concerns, and the UI resolves the key to a bundled asset. A
 * device with no artwork yet renders the caption alone rather than a gap.
 */
export interface TagLocation {
  artworkKey: string | null;
  caption: string;
}

export const TAG_LOCATIONS: Record<DeviceTypeId, TagLocation> = {
  // The iDOL53's caption carries weight the artwork cannot: the article has two
  // parts, and only the controller has a tag. Someone holding one needs telling
  // which half to present, whatever picture sits above it.
  idol53: {
    artworkKey: 'uc501',
    caption:
      'Tap the UC501 controller, not the DOL53 sensor. The tag is behind the front label.',
  },
  'em500-co2-t-h': {
    artworkKey: 'em500',
    caption: 'The tag is behind the front label, above the vent.',
  },
  'em300-th': {
    artworkKey: 'em300',
    caption: 'The tag is behind the front label, in the upper half.',
  },
  // Shares the EM300 enclosure, so it shares the artwork.
  'em300-di': {
    artworkKey: 'em300',
    caption: 'The tag is behind the front label, in the upper half.',
  },
};

export const DISPLAY_NAMES: Record<DeviceTypeId, string> = {
  idol53: 'iDOL53 Ammonia',
  'em500-co2-t-h': 'EM500-CO2-T-H',
  'em300-th': 'EM300-TH',
  'em300-di': 'EM300-DI',
};

export function capabilitiesFor(
  typeId: DeviceTypeId | null,
): DeviceCapabilities | null {
  return typeId ? CAPABILITIES[typeId] : null;
}
