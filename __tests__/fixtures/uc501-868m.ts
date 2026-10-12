/**
 * A real `readFlash()` payload, captured from a physical UC501-868M on
 * 2026-09-16 (firmware V1.6, hardware V3.0).
 *
 * This is hardware ground truth, not a hand-written mock. Keeping it as a
 * fixture is what lets the codec layer be developed and regression-tested
 * without a sensor on the desk — which `CLAUDE.md` calls out as the part most
 * worth testing.
 *
 * Key material is replaced with the same `<redacted:N chars>` placeholders the
 * redacting logger produces, because that is how it reached us and because real
 * LoRaWAN keys must not live in the repo (REQ-A-15). The device *does* return
 * real values in these fields — see docs/sdk-pre-stage1-review.md.
 *
 * Trimmed only where a field is a long list of repeated identical shapes.
 */
export const UC501_868M_PAYLOAD: Record<string, unknown> = {
  supportRandomKey: 85,
  sn: '6454E28133260003',
  model: 'UC501-868M',
  pn: '',
  deviceEui: '24e124454e281332',
  oem: '0000',
  firmwareVersion: 'V1.6',
  hardwareVersion: 'V3.0',
  deviceInformation: {
    model: 'UC501',
    subModel1: '868M',
    subModel2: '0000',
    subModel3: '0000',
    subModel4: '0000',
    pn1: '',
    pn2: '',
    pn3: '',
    pn4: '',
  },
  deviceState: 1,
  timezone: 10,
  joinStatus: 0,
  rssi: -104,
  snr: -9,
  deviceTime: 1789477190,
  systemUptime: '13013:0:13',
  batteryConsume: 0,
  batteryLeft: 0,
  battery: 93,
  channelMask: '0007',
  upLinkFrameCounter: 0,
  downLinkFrameCounter: 0,
  powerSupplyState: 2,
  interface1v3Output: false,
  interface2v3Output: false,
  globalCollectInterval: 1200,
  enableDataStorage: false,
  retransmitEnable: false,
  gpioSetting: {
    gpio1: {
      enable: false,
      type: 0,
      diType: 0,
      keepCountValue: false,
      filter: true,
    },
    gpio2: {
      enable: false,
      type: 0,
      diType: 0,
      keepCountValue: false,
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
    enable: true,
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
  classType: 2,
  port: 85,
  joinType: 1,
  txPower: 0,
  loraVersion: 1,
  pingSlotPeriod: 1,
  deviceAddress: 'e2813326',
  gwSpecific: false,
  window2Freq: 869525000,
  window2Dr: 0,
  supportFreq: 3,
  freqRegion: 0,
  dataRate: 2,
  freqMode: 2,
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
      enable: false,
      address: '11111111',
      appskey: '<redacted:32 chars>',
      nwkskey: '<redacted:32 chars>',
    },
  ],
  alarmReport: false,
  regularReport: false,
  confirmPackages: 4,
  rejoinMode: true,
  adr: true,
  singleChannelMode: false,
  reportingInterval: 1200,
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
