import type {
  ConnectionState,
  DeviceCapabilities,
  DeviceIdentity,
  Region,
} from './device';

/**
 * The view model the device screen renders (PRD B4, REQ-A-14).
 *
 * Deliberately a plain data shape with no behaviour: Stage 3 builds the layout
 * against this, Stage 4 fills it from a real read. Keeping the boundary here
 * means the shell can be developed and tested with no hardware and no NFC code
 * in the import graph.
 *
 * Every field that a device may not report is nullable. "Not applicable" and
 * "not read yet" both render as an absent row rather than a zero — which
 * matters, because a UC501 that has never joined reports `rssi: 0`, and showing
 * that as a real measurement would be actively misleading.
 */

/** Power state is a state, reboot is an action (REQ-A-05). */
export type PowerState = 'on' | 'off' | 'unknown';

export interface ControlModel {
  powerState: PowerState;
}

export interface MeasurementReading {
  /** Matches `MeasurementCapability.key`. */
  key: string;
  label: string;
  /** Formatted for display. Null when the device did not report it. */
  value: string | null;
  unit: string;
}

export interface MeasurementModel {
  readings: MeasurementReading[];
  /** Epoch ms when the values were read, for "time read" (REQ-A-07). */
  readAt: number | null;
}

/**
 * Whether the firmware/hardware revision is one dol-sensors has qualified
 * (PRD B3). There is no qualified-revision list anywhere in the source
 * materials yet, so this is carried as data and always `unknown` for now.
 */
export type RevisionVerdict = 'qualified' | 'not-qualified' | 'unknown';

/**
 * AppKey presence, never its value (REQ-A-15).
 *
 * The concept screens show an AppKey row whose right-hand side is a "Verified"
 * pill and whose sub-label reads "Loaded in production" — status only. That is
 * exactly the right shape for a key the app must never display or export, so
 * the model carries a status and no value at all.
 */
export type AppKeyStatus = 'verified' | 'missing' | 'unknown';

export interface DeviceSectionModel {
  identity: DeviceIdentity;
  /** Enabled interfaces, iDOL53 only (PRD B3). */
  activeInputs: string[];
  /** Human summary for the Configuration row, iDOL53/UC50X only. */
  configurationLabel: string | null;
  revisionVerdict: RevisionVerdict;
  appKey: AppKeyStatus;
}

/** Good / Weak / Unusable / Disconnected, per the PRD B5 table. */
export type SignalVerdict = 'good' | 'weak' | 'unusable' | 'disconnected';

export interface SignalModel {
  verdict: SignalVerdict;
  /** dBm. Null when the device has no reading — not zero. */
  rssi: number | null;
  /** dB. Null when the device has no reading. */
  snr: number | null;
}

export interface NetworkModel {
  connection: ConnectionState;
  /** e.g. "4 min ago". Null when there is nothing to qualify. */
  connectionDetail: string | null;
  signal: SignalModel;
  /** Region currently on the device. */
  region: Region | null;
  /** Regions the drop-down may offer, scoped to the band group (REQ-A-08). */
  selectableRegions: Region[];
  /** True when there is nothing to choose: show static text, no control. */
  regionIsFixed: boolean;
}

/** The iDOL53's 24 V supply, shown above the battery row (PRD B3). */
export type ExternalSupplyState = 'present' | 'absent' | 'unknown';

export interface PowerModel {
  batteryPercent: number | null;
  /**
   * Sub-label for the battery row. The concept words this differently by
   * device type on purpose: on a mains-powered iDOL53 it warns that the figure
   * is not the service life, on a battery sensor it says that it is.
   */
  batterySublabel: string | null;
  /** Null on device types with no external supply. */
  externalSupply: ExternalSupplyState | null;
  /** Seconds. Read-only (REQ-A-12). */
  reportingIntervalSeconds: number | null;
  /** Named source for the interval, e.g. "set from the gateway". */
  reportingIntervalSource: string;
}

export interface DeviceScreenModel {
  capabilities: DeviceCapabilities;
  control: ControlModel;
  measurement: MeasurementModel;
  device: DeviceSectionModel;
  network: NetworkModel;
  power: PowerModel;
}

/**
 * Section order is fixed across every device type (REQ-A-14). Exported so the
 * screen and its tests agree on one definition rather than two.
 */
export const SECTION_ORDER = [
  'control',
  'measurement',
  'device',
  'network',
  'power',
  'actions',
] as const;

export type SectionId = (typeof SECTION_ORDER)[number];

export const SECTION_TITLES: Record<SectionId, string> = {
  control: 'Control',
  measurement: 'Measurement',
  device: 'Device',
  network: 'Network',
  power: 'Power',
  actions: 'Actions',
};
