/**
 * A real `readFlash()` payload from a physical EM300-TH-868M, captured
 * 2026-09-17 (firmware V1.11, hardware V3.1). Not joined to a gateway
 * (`joinStatus: 0`), which Milesight Toolbox reported as "de-activated".
 *
 * This device is detected by the SDK as an **old-protocol device** — its
 * IPSOv2 probe returns `ackError`, the SDK caches "not supported" after 82 ms
 * and reads successfully over the legacy path. Useful as the counterpart to the
 * UC501, which needs the IPSOv2 path.
 *
 * Key material carries the redaction placeholders it arrived with.
 */
export const EM300_TH_868M_PAYLOAD: Record<string, unknown> = {
  supportRandomKey: 85,
  status: [
    {name: 'sn', value: '613606506C751008'},
    {name: 'model', value: 'EM300-TH-868M'},
    {name: 'deviceEui', value: '24e12413606506c7'},
    {name: 'firmwareVersion', value: 'V1.11'},
    {name: 'hardwareVersion', value: 'V3.1'},
    {name: 'deviceState', value: 1},
    {name: 'joinStatus', value: 0},
    {name: 'rssi/snr', value: '-103/-21'},
    {name: 'temperature', value: '15.2', unit: '℃', type: 'temperature'},
    {name: 'humidity', value: '73.0', unit: '%', type: 'humidity'},
    {name: 'battery', value: 100, unit: '%'},
  ],
  sn: '613606506C751008',
  model: 'EM300-TH-868M',
  pn: '',
  deviceEui: '24e12413606506c7',
  oem: '0010',
  firmwareVersion: 'V1.11',
  hardwareVersion: 'V3.1',
  deviceInformation: {
    model: 'EM300',
    subModel1: 'TH',
    subModel2: '868M',
    subModel3: '',
    subModel4: '',
  },
  deviceState: 1,
  timezone: 0,
  joinStatus: 0,
  rssi: -103,
  snr: -21,
  deviceTime: 1789625407,
  systemUptime: '13398:28:15',
  batteryVoltage: 3566,
  battery: 100,
  channelMask: '0007',
  upLinkFrameCounter: 0,
  downLinkFrameCounter: 0,
  temperature: {
    enable: true,
    value: '15.2',
    unit: '℃',
    calibration: {enable: false, value: '0.0'},
  },
  humidity: {
    enable: true,
    value: '73.0',
    unit: '%',
    calibration: {enable: false, value: '0.0'},
  },
  enableDataStorage: false,
  retransmitEnable: false,
  appEUI: '24e124c0002a0001',
  classType: 0,
  port: 85,
  joinType: 1,
  loraVersion: 2,
  deviceAddress: '065e3979',
  window2Freq: 869525000,
  supportFreq: 3,
  freqRegion: 0,
  dataRate: 2,
  freqMode: 0,
  channelPlan: 0,
  freqs: [
    {value: 868.1, enable: true},
    {value: 868.3, enable: true},
    {value: 868.5, enable: true},
  ],
  multicast: [
    {
      enable: false,
      address: '00000000',
      appskey: '<redacted:32 chars>',
      nwkskey: '<redacted:32 chars>',
    },
  ],
  alarmReport: false,
  regularReport: true,
  adr: true,
  reportingInterval: 600,
  sleepMode: false,
  readMode: 'nfc',
  applicationKey: '<redacted:32 chars>',
  applicationSessionKey: '<redacted:32 chars>',
  networkSessionKey: '<redacted:32 chars>',
  appskey: '<redacted:32 chars>',
  nwkskey: '<redacted:32 chars>',
};
