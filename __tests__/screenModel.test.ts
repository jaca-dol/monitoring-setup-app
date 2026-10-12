import {buildScreenModel} from '../src/codec/screenModel';
import {readingOrNull, signalVerdict} from '../src/codec/signalVerdict';

import {EM300_DI_868M_PAYLOAD} from './fixtures/em300-di-868m';
import {EM300_TH_868M_PAYLOAD} from './fixtures/em300-th-868m';
import {EM500_CO2_868M_PAYLOAD} from './fixtures/em500-co2-868m';
import {UC501_868M_V3_PAYLOAD} from './fixtures/uc501-868m-v3';
import {UC501_868M_PAYLOAD} from './fixtures/uc501-868m';

/**
 * Stage 4 read path, exercised against the four payloads captured from real
 * hardware. Every expectation below is a value a physical sensor reported.
 */

/** What the transport strips from every one of these payloads. */
const SECRETS = [
  'applicationKey',
  'applicationSessionKey',
  'networkSessionKey',
  'appskey',
  'nwkskey',
];

function build(payload: Record<string, unknown>, removedSecrets = SECRETS) {
  return buildScreenModel({payload, removedSecrets});
}

describe('signalVerdict — PRD B5 table', () => {
  it('grades RSSI when the device is connected', () => {
    expect(signalVerdict('connected', -80)).toBe('good');
    expect(signalVerdict('connected', -94)).toBe('good');
    expect(signalVerdict('connected', -95)).toBe('weak');
    expect(signalVerdict('connected', -100)).toBe('weak');
    expect(signalVerdict('connected', -101)).toBe('unusable');
  });

  it('reports Disconnected regardless of signal strength', () => {
    expect(signalVerdict('disconnected', -50)).toBe('disconnected');
  });

  it('never renders a missing reading as Good', () => {
    // The trap: a never-joined UC501 reports rssi 0, and 0 > -95.
    expect(signalVerdict('connected', null)).toBe('disconnected');
    expect(signalVerdict('disconnected', 0)).toBe('disconnected');
  });
});

describe('readingOrNull', () => {
  it('treats 0 from an unjoined device as no reading', () => {
    expect(readingOrNull(0, false)).toBeNull();
  });

  it('keeps a genuine 0 from a joined device', () => {
    expect(readingOrNull(0, true)).toBe(0);
  });

  it('keeps negative readings', () => {
    expect(readingOrNull(-103, true)).toBe(-103);
    expect(readingOrNull(-21, true)).toBe(-21);
  });

  it('rejects non-numbers', () => {
    expect(readingOrNull(undefined, true)).toBeNull();
    expect(readingOrNull(Number.NaN, true)).toBeNull();
  });
});

describe('buildScreenModel — EM500-CO2 (joined, good signal)', () => {
  const model = build(EM500_CO2_868M_PAYLOAD)!;

  it('identifies the device and its capabilities', () => {
    expect(model.device.identity.typeId).toBe('em500-co2-t-h');
    expect(model.capabilities.measurements).toHaveLength(4);
  });

  it('reads all four measured values from the status list', () => {
    expect(model.measurement.readings.map(r => [r.key, r.value])).toEqual([
      ['temperature', '18.5'],
      ['humidity', '60.5'],
      ['co2', '497'],
      ['pressure', '1003.9'],
    ]);
  });

  it('reports connected, with a Good verdict from RSSI alone', () => {
    expect(model.network.connection).toBe('connected');
    expect(model.network.signal.verdict).toBe('good');
    expect(model.network.signal.rssi).toBe(-86);
    expect(model.network.signal.snr).toBe(11);
  });

  it('reads power without an external supply row', () => {
    expect(model.power.batteryPercent).toBe(100);
    expect(model.power.externalSupply).toBeNull();
    expect(model.power.reportingIntervalSeconds).toBe(120);
  });

  it('reports the AppKey as verified without handling a value', () => {
    expect(model.device.appKey).toBe('verified');
  });
});

describe('buildScreenModel — EM300-TH (not joined, negative SNR)', () => {
  const model = build(EM300_TH_868M_PAYLOAD)!;

  it('reports disconnected and does not grade the RSSI', () => {
    expect(model.network.connection).toBe('disconnected');
    expect(model.network.signal.verdict).toBe('disconnected');
  });

  it('still carries the readings so they can be displayed', () => {
    expect(model.network.signal.rssi).toBe(-103);
    expect(model.network.signal.snr).toBe(-21);
  });

  it('reads both measured values', () => {
    expect(model.measurement.readings.map(r => r.value)).toEqual([
      '15.2',
      '73.0',
    ]);
  });
});

describe('buildScreenModel — UC501 (iDOL53)', () => {
  const older = build(UC501_868M_PAYLOAD)!;
  const newer = build(UC501_868M_V3_PAYLOAD)!;

  it('identifies both batches as the iDOL53 article', () => {
    expect(older.device.identity.typeId).toBe('idol53');
    expect(newer.device.identity.typeId).toBe('idol53');
  });

  it('has no measurement channel until the DOL53 spec lands', () => {
    expect(older.capabilities.measurements).toEqual([]);
    expect(older.measurement.readings).toEqual([]);
  });

  it('shows the 24 V supply above a battery labelled as backup', () => {
    expect(newer.power.externalSupply).toBe('present');
    expect(newer.power.batterySublabel).toBe('Not the service life');
    expect(newer.power.batteryPercent).toBe(47);
  });

  it('reports each unit’s own active inputs', () => {
    expect(older.device.activeInputs).toEqual(['rs232']);
    expect(newer.device.activeInputs).toEqual(['gpio1', 'gpio2']);
  });

  it('builds a configuration label only where there is a config', () => {
    expect(newer.device.configurationLabel).toContain('gpio1');
    expect(build(EM300_TH_868M_PAYLOAD)!.device.configurationLabel).toBeNull();
  });

  it('shows no signal reading for a never-joined unit', () => {
    // rssi 0 / snr 0, 39 seconds after power-on.
    expect(newer.network.signal.rssi).toBeNull();
    expect(newer.network.signal.snr).toBeNull();
    expect(newer.network.signal.verdict).toBe('disconnected');
  });

  it('reads the power state from deviceState', () => {
    expect(older.control.powerState).toBe('on');
  });
});

describe('buildScreenModel — EM300-DI (real payload, 2026-09-28)', () => {
  const model = build(EM300_DI_868M_PAYLOAD)!;

  it('identifies the DI variant rather than falling back to unsupported', () => {
    expect(model).not.toBeNull();
    expect(model.device.identity.typeId).toBe('em300-di');
    expect(model.device.identity.displayName).toBe('EM300-DI');
    expect(model.device.identity.baseModel).toBe('EM300');
    expect(model.device.identity.bandLabel).toBe('868M');
  });

  it('reads the two typed channels', () => {
    const byKey = new Map(model.measurement.readings.map(r => [r.key, r]));

    expect(byKey.get('temperature')?.value).toBe('25.7');
    expect(byKey.get('humidity')?.value).toBe('47.0');
  });

  it('reads the digital input, which the device reports untyped', () => {
    // The point of this variant. `diLevel` and `diCount` carry no `type`, so a
    // type-only extractor drops exactly the channel the DI exists for.
    const byKey = new Map(model.measurement.readings.map(r => [r.key, r]));

    expect(byKey.get('diLevel')?.value).toBe('Low');
    expect(byKey.get('diCount')?.value).toBe('16');
  });

  it('shows a false input level rather than treating it as missing', () => {
    // `diLevel: false` is a reading, not an absence — a falsy check would show
    // this as "—" and an installer would read that as a broken input.
    const level = model.measurement.readings.find(r => r.key === 'diLevel');

    expect(level?.value).not.toBeNull();
  });

  it('refuses to read its never-joined 0/0 as a strong signal', () => {
    expect(model.network.signal.rssi).toBeNull();
    expect(model.network.signal.verdict).toBe('disconnected');
  });

  it('carries no key material', () => {
    expect(JSON.stringify(model)).not.toMatch(/[0-9a-fA-F]{32}/);
    expect(model.device.appKey).toBe('verified');
  });
});

describe('buildScreenModel — region policy (REQ-A-08)', () => {
  it('offers every region the hardware reports', () => {
    // Decided 2026-09-29: RESTRICT_868M_TO_SINGLE_REGION is off, so an 868M
    // device offers the three regions its supportFreq 3 actually means rather
    // than being pinned to EU868. See src/config/network.ts.
    const model = build(EM300_TH_868M_PAYLOAD)!;

    expect(model.network.regionIsFixed).toBe(false);
    expect(model.network.selectableRegions).toEqual([
      'EU868',
      'IN865',
      'RU864',
    ]);
    expect(model.network.region).toBe('EU868');
  });

  it('still reports a genuinely single-region device as fixed', () => {
    // Not a policy choice: hardware that supports one region has nothing to
    // choose, and REQ-A-08 says such a row reports without inviting a tap.
    const single = {...EM300_TH_868M_PAYLOAD, supportFreq: 2};

    expect(build(single)!.network.regionIsFixed).toBe(true);
  });
});

describe('buildScreenModel — degrading safely', () => {
  it('returns null for a device outside the supported set', () => {
    expect(
      build({model: 'WS523-868M', deviceInformation: {model: 'WS523'}}),
    ).toBeNull();
  });

  it('does not throw on an empty payload', () => {
    expect(() => build({})).not.toThrow();
  });

  it('reports an unknown power state rather than guessing', () => {
    const model = build({...EM300_TH_868M_PAYLOAD, deviceState: 7})!;
    expect(model.control.powerState).toBe('unknown');
  });

  it('reports an unknown supply state rather than asserting one', () => {
    const model = build({...UC501_868M_PAYLOAD, powerSupplyState: 9})!;
    expect(model.power.externalSupply).toBe('unknown');
  });

  it('reports the AppKey as unknown when nothing was stripped', () => {
    expect(build(EM300_TH_868M_PAYLOAD, [])!.device.appKey).toBe('unknown');
  });

  it('leaves a capability the device did not report as an empty value', () => {
    const withoutCo2 = {
      ...EM500_CO2_868M_PAYLOAD,
      status: (EM500_CO2_868M_PAYLOAD.status as unknown[]).filter(
        entry => (entry as {type?: string}).type !== 'co2concentration',
      ),
    };
    const co2 = build(withoutCo2)!.measurement.readings.find(
      r => r.key === 'co2',
    );

    expect(co2).toBeDefined();
    expect(co2?.value).toBeNull();
  });
});
