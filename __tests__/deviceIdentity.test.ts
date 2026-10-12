import {
  describeInputConfig,
  identifyDevice,
  regionFromCode,
  splitModel,
  supportedRegionsFromCode,
} from '../src/codec/deviceIdentity';
import {capabilitiesFor} from '../src/domain/device';

import {EM300_TH_868M_PAYLOAD} from './fixtures/em300-th-868m';
import {EM500_CO2_868M_PAYLOAD} from './fixtures/em500-co2-868m';
import {UC501_868M_V3_PAYLOAD} from './fixtures/uc501-868m-v3';
import {UC501_868M_PAYLOAD} from './fixtures/uc501-868m';

/**
 * Every case below runs against a payload captured from real hardware. All
 * three in-scope device types are represented (REQ-A-01).
 */

describe('identifyDevice — UC501-868M (iDOL53)', () => {
  const identity = identifyDevice(UC501_868M_PAYLOAD);

  it('maps a UC501 to the iDOL53 article', () => {
    expect(identity.typeId).toBe('idol53');
    expect(identity.displayName).toBe('iDOL53 Ammonia');
  });

  it('reads the band from subModel1 when there is no variant', () => {
    expect(identity.baseModel).toBe('UC501');
    expect(identity.bandLabel).toBe('868M');
  });

  it('carries identity and revision fields through', () => {
    expect(identity.devEui).toBe('24e124454e281332');
    expect(identity.serialNumber).toBe('6454E28133260003');
    expect(identity.firmwareVersion).toBe('V1.6');
    expect(identity.hardwareVersion).toBe('V3.0');
  });
});

describe('identifyDevice — second UC501-868M with an OEM sub-model', () => {
  const identity = identifyDevice(UC501_868M_V3_PAYLOAD);

  it('is not fooled by a numeric OEM code in subModel4', () => {
    // subModel4 is '0010', matching the oem field. Treating it as a product
    // variant produced the key UC501-0010 and reported UNSUPPORTED.
    expect(identity.typeId).toBe('idol53');
    expect(identity.displayName).toBe('iDOL53 Ammonia');
  });

  it('still finds the band and leaves the variant empty', () => {
    expect(identity.baseModel).toBe('UC501');
    expect(identity.bandLabel).toBe('868M');
  });

  it('reports the GPIO inputs this unit has enabled', () => {
    expect(describeInputConfig(UC501_868M_V3_PAYLOAD)).toEqual([
      'gpio1',
      'gpio2',
    ]);
  });
});

describe('identifyDevice — EM500-CO2-868M', () => {
  const identity = identifyDevice(EM500_CO2_868M_PAYLOAD);

  it('combines base model and variant into the article', () => {
    expect(identity.typeId).toBe('em500-co2-t-h');
    expect(identity.displayName).toBe('EM500-CO2-T-H');
  });

  it('finds the band in subModel2, past the variant in subModel1', () => {
    expect(identity.baseModel).toBe('EM500');
    expect(identity.bandLabel).toBe('868M');
  });

  it('reads revisions and identity', () => {
    expect(identity.firmwareVersion).toBe('V1.11');
    expect(identity.hardwareVersion).toBe('V2.1');
    expect(identity.devEui).toBe('24e1241260618e76');
  });
});

describe('identifyDevice — EM300-TH-868M', () => {
  const identity = identifyDevice(EM300_TH_868M_PAYLOAD);

  it('combines base model and variant into the article', () => {
    expect(identity.typeId).toBe('em300-th');
    expect(identity.displayName).toBe('EM300-TH');
  });

  it('finds the band in subModel2, past the variant in subModel1', () => {
    expect(identity.baseModel).toBe('EM300');
    expect(identity.bandLabel).toBe('868M');
  });
});

describe('band group and region', () => {
  it('reports the same band group for all three units', () => {
    // Every unit on hand reports supportFreq 3.
    for (const payload of [
      UC501_868M_PAYLOAD,
      EM500_CO2_868M_PAYLOAD,
      EM300_TH_868M_PAYLOAD,
    ]) {
      const identity = identifyDevice(payload);
      expect(identity.supportedRegions).toEqual(['EU868', 'IN865', 'RU864']);
      expect(identity.currentRegion).toBe('EU868');
    }
  });

  it('does not treat an 868M device as having a fixed region', () => {
    // Contradicts PRD REQ-A-08, which says "-868M" shows static EU868 text.
    // All three units report three selectable regions. Flagged, not resolved —
    // see docs/stage2-device-model.md.
    expect(identifyDevice(UC501_868M_PAYLOAD).regionIsFixed).toBe(false);
  });

  it('marks a single-region band group as fixed', () => {
    // supportFreq 2 is CN470 only.
    const identity = identifyDevice({model: 'UC501-470M', supportFreq: 2});
    expect(identity.supportedRegions).toEqual(['CN470']);
    expect(identity.regionIsFixed).toBe(true);
  });

  it('treats unknown codes as unknown, not as EU868', () => {
    expect(regionFromCode(99)).toBeNull();
    expect(regionFromCode(null)).toBeNull();
    expect(supportedRegionsFromCode(99)).toEqual([]);
  });
});

describe('splitModel', () => {
  it('handles the UC501 shape: band in subModel1, no variant', () => {
    expect(
      splitModel({
        model: 'UC501-868M',
        deviceInformation: {
          model: 'UC501',
          subModel1: '868M',
          subModel2: '0000',
        },
      }),
    ).toEqual({
      model: 'UC501-868M',
      baseModel: 'UC501',
      variant: '',
      bandLabel: '868M',
      typeKey: 'UC501',
    });
  });

  it('handles the EM500 shape: variant in subModel1, band in subModel2', () => {
    expect(
      splitModel({
        model: 'EM500-CO2-868M',
        deviceInformation: {
          model: 'EM500',
          subModel1: 'CO2',
          subModel2: '868M',
        },
      }),
    ).toEqual({
      model: 'EM500-CO2-868M',
      baseModel: 'EM500',
      variant: 'CO2',
      bandLabel: '868M',
      typeKey: 'EM500-CO2',
    });
  });

  it('ignores the 0000 placeholder in unused sub-model slots', () => {
    const parts = splitModel({
      model: 'UC501-868M',
      deviceInformation: {
        model: 'UC501',
        subModel1: '868M',
        subModel2: '0000',
        subModel3: '0000',
      },
    });
    expect(parts.variant).toBe('');
  });

  it('falls back to parsing the model string when deviceInformation is absent', () => {
    expect(splitModel({model: 'EM300-TH-868M'})).toEqual({
      model: 'EM300-TH-868M',
      baseModel: 'EM300',
      variant: 'TH',
      bandLabel: '868M',
      typeKey: 'EM300-TH',
    });
  });

  it('handles a model string with no band suffix', () => {
    expect(splitModel({model: 'EM300-TH'}).typeKey).toBe('EM300-TH');
  });

  it('handles a bare model with no dashes', () => {
    expect(splitModel({model: 'UC501'})).toEqual({
      model: 'UC501',
      baseModel: 'UC501',
      variant: '',
      bandLabel: '',
      typeKey: 'UC501',
    });
  });
});

describe('capabilities', () => {
  it('gives the iDOL53 an external supply and an input config', () => {
    const caps = capabilitiesFor('idol53');
    expect(caps?.hasExternalSupply).toBe(true);
    expect(caps?.hasActiveInputConfig).toBe(true);
  });

  it('leaves the iDOL53 measurement list empty until the DOL53 spec lands', () => {
    expect(capabilitiesFor('idol53')?.measurements).toEqual([]);
  });

  it('gives the EM500 four measurements and the EM300 two', () => {
    expect(capabilitiesFor('em500-co2-t-h')?.measurements).toHaveLength(4);
    expect(capabilitiesFor('em300-th')?.measurements).toHaveLength(2);
  });

  it('includes pressure on the EM500, per the 2026-09-17 product decision', () => {
    const keys = capabilitiesFor('em500-co2-t-h')?.measurements.map(m => m.key);
    expect(keys).toEqual(['temperature', 'humidity', 'co2', 'pressure']);
  });

  it('gives neither battery-powered sensor an external supply row', () => {
    expect(capabilitiesFor('em500-co2-t-h')?.hasExternalSupply).toBe(false);
    expect(capabilitiesFor('em300-th')?.hasExternalSupply).toBe(false);
  });

  it('returns null for an unidentified device', () => {
    expect(capabilitiesFor(null)).toBeNull();
  });
});

describe('describeInputConfig', () => {
  it('reports RS232 as the only enabled interface on the UC501 under test', () => {
    expect(describeInputConfig(UC501_868M_PAYLOAD)).toEqual(['rs232']);
  });

  it('reports nothing for sensors that have no interface blocks', () => {
    expect(describeInputConfig(EM500_CO2_868M_PAYLOAD)).toEqual([]);
    expect(describeInputConfig(EM300_TH_868M_PAYLOAD)).toEqual([]);
  });

  it('reports every enabled interface', () => {
    const payload = {
      rs232: {enable: false},
      rs485: {enable: true},
      aiSetting: {ai1: {enable: true}, ai2: {enable: false}},
      gpioSetting: {gpio1: {enable: false}, gpio2: {enable: true}},
    };
    expect(describeInputConfig(payload)).toEqual(['rs485', 'ai1', 'gpio2']);
  });
});

describe('degrading on unexpected payloads', () => {
  it('does not throw on an empty payload', () => {
    const identity = identifyDevice({});
    expect(identity.typeId).toBeNull();
    expect(identity.displayName).toBe('Unsupported device');
    expect(identity.supportedRegions).toEqual([]);
  });

  it('marks an out-of-range Milesight model as unsupported rather than guessing', () => {
    const identity = identifyDevice({
      model: 'WS523-868M',
      deviceInformation: {model: 'WS523', subModel1: '868M'},
      supportFreq: 3,
    });
    expect(identity.typeId).toBeNull();
    expect(identity.baseModel).toBe('WS523');
  });

  it('does not confuse a different EM500 variant with the CO2 model', () => {
    const identity = identifyDevice({
      model: 'EM500-PT100-868M',
      deviceInformation: {
        model: 'EM500',
        subModel1: 'PT100',
        subModel2: '868M',
      },
    });
    expect(identity.typeId).toBeNull();
  });
});
