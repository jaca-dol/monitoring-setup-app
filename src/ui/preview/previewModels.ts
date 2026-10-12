import {
  CAPABILITIES,
  DISPLAY_NAMES,
  type DeviceTypeId,
} from '../../domain/device';
import type {DeviceScreenModel} from '../../domain/screen';

/**
 * Static models for the Stage 3 shell.
 *
 * **Scaffolding — delete when Stage 4 wires the real read in.**
 *
 * Values come from the four real devices read on 2026-09-16/17 rather than
 * being invented, so the layout is checked against realistic content: a
 * 16-character serial, a DevEUI, a four-value measurement row, a negative SNR,
 * and the never-joined case that reports no signal at all.
 */

const READ_AT = Date.UTC(2026, 8, 17, 13, 17, 0);

function identityFor(
  typeId: DeviceTypeId,
  over: Partial<DeviceScreenModel['device']['identity']>,
): DeviceScreenModel['device']['identity'] {
  return {
    typeId,
    displayName: DISPLAY_NAMES[typeId],
    model: '',
    baseModel: '',
    bandLabel: '868M',
    supportedRegions: ['EU868', 'IN865', 'RU864'],
    currentRegion: 'EU868',
    regionIsFixed: false,
    firmwareVersion: '',
    hardwareVersion: '',
    devEui: '',
    serialNumber: '',
    ...over,
  };
}

/** EM500-CO2-868M: joined, good signal, four measured values. */
const em500: DeviceScreenModel = {
  capabilities: CAPABILITIES['em500-co2-t-h'],
  control: {powerState: 'on'},
  measurement: {
    readAt: READ_AT,
    readings: [
      {key: 'co2', label: 'CO₂', value: '497', unit: 'ppm'},
      {key: 'temperature', label: 'Temp.', value: '18.5', unit: '°C'},
      {key: 'humidity', label: 'Humidity', value: '60.5', unit: '%'},
      {key: 'pressure', label: 'Pressure', value: '1003.9', unit: 'hPa'},
    ],
  },
  device: {
    identity: identityFor('em500-co2-t-h', {
      model: 'EM500-CO2-868M',
      baseModel: 'EM500',
      firmwareVersion: '1.11',
      hardwareVersion: 'V2.1',
      devEui: '24E1241260618E76',
      serialNumber: '61260618E7696007',
    }),
    activeInputs: [],
    configurationLabel: null,
    revisionVerdict: 'unknown',
    appKey: 'verified',
  },
  network: {
    connection: 'connected',
    connectionDetail: '11 min ago',
    signal: {verdict: 'good', rssi: -86, snr: 11},
    region: 'EU868',
    selectableRegions: ['EU868', 'IN865', 'RU864'],
    regionIsFixed: false,
  },
  power: {
    batteryPercent: 100,
    batterySublabel: 'Service life at 2 min',
    externalSupply: null,
    reportingIntervalSeconds: 120,
    reportingIntervalSource: 'Set from the gateway',
  },
};

/** EM300-TH-868M: not joined, negative SNR, two measured values. */
const em300: DeviceScreenModel = {
  capabilities: CAPABILITIES['em300-th'],
  control: {powerState: 'on'},
  measurement: {
    readAt: READ_AT,
    readings: [
      {key: 'temperature', label: 'Temperature', value: '15.2', unit: '°C'},
      {key: 'humidity', label: 'Humidity', value: '73.0', unit: '%'},
    ],
  },
  device: {
    identity: identityFor('em300-th', {
      model: 'EM300-TH-868M',
      baseModel: 'EM300',
      firmwareVersion: '1.11',
      hardwareVersion: 'V3.1',
      devEui: '24E12413606506C7',
      serialNumber: '613606506C751008',
    }),
    activeInputs: [],
    configurationLabel: null,
    revisionVerdict: 'unknown',
    appKey: 'verified',
  },
  network: {
    connection: 'disconnected',
    connectionDetail: null,
    signal: {verdict: 'unusable', rssi: -103, snr: -21},
    region: 'EU868',
    selectableRegions: ['EU868', 'IN865', 'RU864'],
    regionIsFixed: false,
  },
  power: {
    batteryPercent: 100,
    batterySublabel: 'Service life at 10 min',
    externalSupply: null,
    reportingIntervalSeconds: 600,
    reportingIntervalSource: 'Set from the gateway',
  },
};

/**
 * EM300-DI-868M: two sensed values plus a digital input, never joined.
 *
 * The four-cell measurement row here is not four sensor readings — two are the
 * input's level and pulse count, which have no unit and are not numbers in the
 * same sense. Worth having in the preview for exactly that reason.
 */
const em300di: DeviceScreenModel = {
  capabilities: CAPABILITIES['em300-di'],
  control: {powerState: 'on'},
  measurement: {
    readAt: READ_AT,
    readings: [
      {key: 'temperature', label: 'Temperature', value: '25.7', unit: '°C'},
      {key: 'humidity', label: 'Humidity', value: '47.0', unit: '%'},
      {key: 'diLevel', label: 'Input', value: 'Low', unit: ''},
      {key: 'diCount', label: 'Pulses', value: '16', unit: ''},
    ],
  },
  device: {
    identity: identityFor('em300-di', {
      model: 'EM300-DI-868M',
      baseModel: 'EM300',
      firmwareVersion: 'V1.3',
      hardwareVersion: 'V3.1',
      devEui: '24E12413606EAAE8',
      serialNumber: '613606EAAE824301',
    }),
    activeInputs: [],
    configurationLabel: null,
    revisionVerdict: 'unknown',
    appKey: 'verified',
  },
  network: {
    connection: 'disconnected',
    connectionDetail: null,
    // Never joined: reports 0/0, which must not render as an excellent signal.
    signal: {verdict: 'disconnected', rssi: null, snr: null},
    region: 'EU868',
    selectableRegions: ['EU868', 'IN865', 'RU864'],
    regionIsFixed: false,
  },
  power: {
    batteryPercent: 100,
    batterySublabel: 'Service life at 10 min',
    externalSupply: null,
    reportingIntervalSeconds: 600,
    reportingIntervalSource: 'Set from the gateway',
  },
};

/**
 * iDOL53 (UC501-868M): mains-powered, never joined.
 *
 * Exercises the 24 V supply row above a battery labelled as backup, the empty
 * measurement card, and a device that reports no signal reading at all rather
 * than a misleadingly strong one.
 */
const idol53: DeviceScreenModel = {
  capabilities: CAPABILITIES.idol53,
  control: {powerState: 'on'},
  measurement: {readAt: READ_AT, readings: []},
  device: {
    identity: identityFor('idol53', {
      model: 'UC501-868M',
      baseModel: 'UC501',
      firmwareVersion: '1.6',
      hardwareVersion: 'V3.0',
      devEui: '24E124454F514156',
      serialNumber: '6454F51415670000',
    }),
    activeInputs: ['gpio1', 'gpio2'],
    configurationLabel: 'iDOL53 ammonia · GPIO 1, GPIO 2',
    revisionVerdict: 'unknown',
    appKey: 'verified',
  },
  network: {
    connection: 'disconnected',
    connectionDetail: null,
    signal: {verdict: 'disconnected', rssi: null, snr: null},
    region: 'EU868',
    selectableRegions: ['EU868', 'IN865', 'RU864'],
    regionIsFixed: false,
  },
  power: {
    batteryPercent: 47,
    batterySublabel: 'Not the service life',
    externalSupply: 'present',
    reportingIntervalSeconds: 1200,
    reportingIntervalSource: 'Set from the gateway',
  },
};

export const PREVIEW_MODELS: Record<DeviceTypeId, DeviceScreenModel> = {
  idol53,
  'em500-co2-t-h': em500,
  'em300-th': em300,
  'em300-di': em300di,
};

export const PREVIEW_ORDER: DeviceTypeId[] = [
  'idol53',
  'em500-co2-t-h',
  'em300-th',
  'em300-di',
];
