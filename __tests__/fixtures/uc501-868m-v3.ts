/**
 * A second, newer UC501-868M, captured 2026-09-17 (firmware V1.6, hardware
 * V3.0 — same revisions as the first unit, but a different production batch).
 *
 * Kept alongside `uc501-868m.ts` because it differs in three ways that each
 * broke or nearly broke an assumption:
 *
 * 1. `deviceInformation.subModel4` is `'0010'` — a numeric OEM code, matching
 *    the `oem` field. The first unit had `'0000'` there. Treating any non-band
 *    sub-model as a product variant produced the article key `UC501-0010` and
 *    identified this device as UNSUPPORTED.
 * 2. `rssi` and `snr` are both `0` — the device had just been switched on
 *    (`systemUptime: '0:0:39'`) and has never joined (`joinStatus: 0`). This is
 *    an absent reading, not a strong signal. See docs/stage2-device-model.md.
 * 3. `gpio1` and `gpio2` are enabled and RS232 is not — the opposite of the
 *    first unit's configuration.
 *
 * `loraVersion: 3` and `classType: 0` here, against `1` and `2` on the first
 * unit.
 *
 * Key material carries the redaction placeholders it arrived with.
 */
export const UC501_868M_V3_PAYLOAD: Record<string, unknown> = {
  supportRandomKey: 85,
  status: [
    {name: 'sn', value: '6454F51415670000'},
    {name: 'model', value: 'UC501-868M'},
    {name: 'deviceEui', value: '24e124454f514156'},
    {name: 'firmwareVersion', value: 'V1.6'},
    {name: 'hardwareVersion', value: 'V3.0'},
    {name: 'deviceState', value: 1},
    {name: 'joinStatus', value: 0},
    {name: 'rssi/snr', value: '0/0'},
    {name: 'battery', value: 47, unit: '%'},
  ],
  sn: '6454F51415670000',
  model: 'UC501-868M',
  pn: '',
  deviceEui: '24e124454f514156',
  oem: '0010',
  firmwareVersion: 'V1.6',
  hardwareVersion: 'V3.0',
  deviceInformation: {
    model: 'UC501',
    subModel1: '868M',
    subModel2: '0000',
    subModel3: '0000',
    subModel4: '0010',
  },
  deviceState: 1,
  timezone: 0,
  joinStatus: 0,
  rssi: 0,
  snr: 0,
  deviceTime: 1789626933,
  systemUptime: '0:0:39',
  batteryConsume: 0,
  batteryLeft: 0,
  battery: 47,
  channelMask: '0007',
  upLinkFrameCounter: 0,
  downLinkFrameCounter: 0,
  powerSupplyState: 2,
  globalCollectInterval: 1200,
  enableDataStorage: false,
  retransmitEnable: false,
  gpioSetting: {
    gpio1: {
      enable: true,
      type: 0,
      diType: 0,
      keepCountValue: true,
      filter: true,
    },
    gpio2: {
      enable: true,
      type: 0,
      diType: 0,
      keepCountValue: true,
      filter: true,
    },
  },
  aiSetting: {
    ai1: {
      enable: false,
      type: 0,
      ai1OshCurrent: '20.00',
      ai1OslCurrent: '4.00',
    },
    ai2: {
      enable: false,
      type: 0,
      ai2OshCurrent: '20.00',
      ai2OslCurrent: '4.00',
    },
  },
  rs232: {
    enable: false,
    baud: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 0,
    port: 86,
  },
  rs485: {
    enable: false,
    baud: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 0,
    port: 86,
  },
  rulesForEngine: [],
  channels: [],
  appEUI: '24e124c0002a0001',
  classType: 0,
  port: 85,
  joinType: 1,
  txPower: 0,
  loraVersion: 3,
  pingSlotPeriod: 1,
  deviceAddress: 'f5141567',
  gwSpecific: false,
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
    {value: 0, enable: false},
  ],
  multicast: [
    {
      enable: false,
      address: '11111111',
      appskey: '<redacted:32 chars>',
      nwkskey: '<redacted:32 chars>',
    },
  ],
  alarmReport: false,
  regularReport: false,
  confirmPackages: 32,
  rejoinMode: true,
  adr: true,
  singleChannelMode: false,
  reportingInterval: 1200,
  sleepMode: false,
  displayMode: 0,
  readMode: 'nfc',
  applicationKey: '<redacted:32 chars>',
  applicationSessionKey: '<redacted:32 chars>',
  networkSessionKey: '<redacted:32 chars>',
  appskey: '<redacted:32 chars>',
  nwkskey: '<redacted:32 chars>',
};
