/**
 * A real `readFlash()` payload from a physical EM300-DI-868M, captured
 * 2026-09-28 (firmware V1.3, hardware V3.1). Not joined to a gateway
 * (`joinStatus: 0`), and reporting `rssi/snr` as `0/0` because it never has
 * been — the never-joined case the signal verdict has to refuse to read as a
 * strong signal.
 *
 * Like the EM300-TH, the SDK detects this as an **old-protocol device**: the
 * IPSOv2 probe returns `ackError` within ~40 ms and the read completes over the
 * legacy path. Whole read took 5338 ms for 1030 bytes.
 *
 * The device that motivated `statusName` on `MeasurementCapability`. Its
 * digital input appears in `status[]` as `diLevel` and `diCount` with **no
 * `type` field**, unlike temperature and humidity — so a type-only extractor
 * drops exactly the channel this variant exists for.
 *
 * Key material carries the redaction placeholders the logger produced.
 */
export const EM300_DI_868M_PAYLOAD: Record<string, unknown> = {
  supportRandomKey: 85,
  status: [
    {name: 'sn', value: '613606EAAE824301'},
    {name: 'model', value: 'EM300-DI-868M'},
    {name: 'pn', value: ''},
    {name: 'deviceEui', value: '24e12413606eaae8'},
    {name: 'oem', value: '0010'},
    {name: 'firmwareVersion', value: 'V1.3'},
    {name: 'hardwareVersion', value: 'V3.1'},
    {name: 'deviceState', value: 1},
    {name: 'joinStatus', value: 0},
    {name: 'rssi/snr', value: '0/0'},
    {name: 'deviceTime', value: 1204567},
    {name: 'temperature', value: '25.7', unit: '℃', type: 'temperature'},
    {name: 'humidity', value: '47.0', unit: '%', type: 'humidity'},
    // No `type` on either: the device does not call these measurements.
    {name: 'diLevel', value: false},
    {name: 'diCount', value: 16},
    {name: 'battery', value: 100, unit: '%'},
    {name: 'channelMask', value: '0007'},
    {name: 'upLinkFrameCounter', value: 0},
    {name: 'downLinkFrameCounter', value: 0},
    {name: 'd2dDr', value: 0},
    {name: 'd2dFreq', value: 0},
  ],
  sn: '613606EAAE824301',
  model: 'EM300-DI-868M',
  pn: '',
  deviceEui: '24e12413606eaae8',
  oem: '0010',
  firmwareVersion: 'V1.3',
  hardwareVersion: 'V3.1',
  deviceInformation: {
    model: 'EM300',
    subModel1: 'DI',
    subModel2: '868M',
    subModel3: '',
    subModel4: '',
  },
  deviceState: 1,
  timezone: 0,
  joinStatus: 0,
  rssi: 0,
  snr: 0,
  deviceTime: 1204567,
  temperature: {
    enable: true,
    value: '25.7',
    unit: '℃',
    calibration: {enable: false, value: '0.0'},
    alarmScreen: {enable: false, value: 0, value2: 0},
    threshold: {
      enable: false,
      mode: 0,
      collectInterval: 60,
      continueTime: 0,
      lockTime: 0,
    },
  },
  humidity: {
    enable: true,
    value: '47.0',
    unit: '%',
    calibration: {enable: false, value: '0.0'},
    alarmScreen: {enable: false, value: 0, value2: 0},
  },
  diLevel: false,
  diCount: 16,
  di: {
    mode: 2,
    count: {start: true, pulsedFilter: true},
    pulseConversion: {
      enable: false,
      waterYield: 10,
      waterPulse: 10,
      unit: 'L',
    },
  },
  waterThreshold: {
    enable: false,
    decisionTime: 39,
    flowRunning: {enable: false, excessValue: 0},
    flowStopping: {enable: false, excessValue: 0},
  },
  systemUptime: '32625:56:49',
  batteryLeft: 144339,
  battery_voltage: 363,
  battery: 100,
  channelMask: '0007',
  upLinkFrameCounter: 0,
  downLinkFrameCounter: 0,
  enableDataStorage: false,
  retransmitEnable: false,
  alarmReporting: {enable: false, item: 0, interval: 60, times: 2},
  appEUI: '24e124c0002a0001',
  classType: 0,
  port: 85,
  joinType: 1,
  txPower: 0,
  loraVersion: 2,
  deviceAddress: '06eaae82',
  window2Freq: 869525000,
  window2Dr: 0,
  supportFreq: 3,
  freqRegion: 0,
  dataRate: 2,
  freqMode: 0,
  channelPlan: 0,
  freqs: [
    {value: 868.1, enable: true},
    {value: 868.3, enable: true},
    {value: 868.5, enable: true},
    {value: 867.1, enable: false},
    {value: 867.3, enable: false},
    {value: 867.5, enable: false},
    {value: 867.7, enable: false},
    {value: 867.9, enable: false},
  ],
  multicast: [
    {
      enable: true,
      address: '00000009',
      appskey: '<redacted:32 chars>',
      nwkskey: '<redacted:32 chars>',
    },
    {
      enable: false,
      address: '00000000',
      appskey: '<redacted:32 chars>',
      nwkskey: '<redacted:32 chars>',
    },
  ],
  alarmReport: false,
  regularReport: true,
  confirmPackages: 32,
  rejoinMode: true,
  adr: true,
  singleChannelMode: false,
  reportingInterval: 600,
  sleepMode: false,
  displayMode: 0,
  readMode: 'nfc',
  processPayload: true,
  applicationKey: '<redacted:32 chars>',
  applicationSessionKey: '<redacted:32 chars>',
  networkSessionKey: '<redacted:32 chars>',
  appskey: '<redacted:32 chars>',
  nwkskey: '<redacted:32 chars>',
};
