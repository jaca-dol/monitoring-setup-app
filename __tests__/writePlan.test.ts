import {isEmptyPlan, planWrite} from '../src/codec/writePlan';
import {unappliedFields} from '../src/transport/nfc/writeSettings';

/**
 * The write path is the highest-consequence part of the app, so these tests
 * lean on what it must *refuse* as much as what it produces.
 */

describe('planWrite — nothing to do', () => {
  it('produces an empty plan when no change is requested', () => {
    const result = planWrite({region: 'EU868'}, {});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(isEmptyPlan(result.plan)).toBe(true);
    }
  });

  it('produces an empty plan when the region is already set', () => {
    const result = planWrite({region: 'EU868'}, {region: 'EU868'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.fields).toEqual({});
    }
  });
});

describe('planWrite — the settings shape the codec actually reads', () => {
  it('nests LoRa parameters under pLoRaWANParams', () => {
    // Regression, found on hardware 2026-09-29. A top-level `freqRegion` is
    // where the native codec never looks: the write reported success and the
    // device still read back the old region. See writePlan.ts.
    const result = planWrite({region: 'EU868'}, {region: 'IN865'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.fields).not.toHaveProperty('freqRegion');
      expect(result.plan.fields).toHaveProperty(
        ['pLoRaWANParams', 'freqRegion'],
        8,
      );
    }
  });

  it('verifies against the flat names a read reports, not the nested ones', () => {
    const result = planWrite({region: 'EU868'}, {region: 'IN865'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      // `expect` mirrors the payload, which is flat — checking the read-back
      // against the nested write shape would never match.
      // RX2 moves with the region, so it is verified too — see the RX2 tests.
      expect(result.plan.expect).toMatchObject({freqRegion: 8});
    }
  });

  it('writes AS923-1 alongside the region (REQ-A-09)', () => {
    const result = planWrite({region: 'EU868'}, {region: 'AS923'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      // channelPlan is AS923-only in the device model: 0 = AS923-1.
      expect(result.plan.fields).toHaveProperty(
        ['pLoRaWANParams', 'channelPlan'],
        0,
      );
      expect(result.plan.expect).toMatchObject({
        freqRegion: 4,
        channelPlan: 0,
      });
    }
  });

  it('never puts the channel plan in the user-facing summary as settable', () => {
    const result = planWrite({region: 'EU868'}, {region: 'AS923'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.summary.join(' ')).toContain(
        'written with the region',
      );
    }
  });

  it('describes the change for the confirmation dialog', () => {
    const result = planWrite({region: 'EU868'}, {region: 'RU864'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.summary[0]).toBe('Region: EU868 → RU864');
    }
  });
});

describe('planWrite — channels must match the region being written', () => {
  /** Mirrors the SDK's getFreqLimit, which is what the vendor app validates. */
  const LIMITS: Record<string, [number, number]> = {
    EU868: [863.0, 870.0],
    IN865: [865.0, 867.0],
    RU864: [864.0, 870.0],
    AS923: [915.0, 928.0],
    KR920: [920.9, 923.3],
    EU433: [433.175, 434.665],
  };

  function channelsOf(plan: {fields: Record<string, unknown>}) {
    const lora = plan.fields.pLoRaWANParams as Record<string, unknown>;
    return lora.freqs as ReadonlyArray<{value: number; enable: boolean}>;
  }

  it.each(Object.keys(LIMITS))(
    'writes channels inside %s own valid range',
    region => {
      // The bug this exists for, found on hardware 2026-09-30: writing IN865
      // while sending the device's EU868 channels left an EM300-TH on
      // freqRegion 8 with 868.x channels — above IN865's 867.0 ceiling — and
      // the vendor app then refused every write with "Valid Range 865 - 867".
      // Current region unset, so every target below is a real change.
      const result = planWrite({region: null}, {region: region as never});

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      const limits = LIMITS[region]!;
      for (const channel of channelsOf(result.plan)) {
        expect(channel.value).toBeGreaterThanOrEqual(limits[0]);
        expect(channel.value).toBeLessThanOrEqual(limits[1]);
      }
    },
  );

  it('sends the target region channels, never the current ones', () => {
    const result = planWrite({region: 'EU868'}, {region: 'IN865'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      const values = channelsOf(result.plan).map(c => c.value);
      expect(values).not.toContain(868.1);
      expect(values).toContain(865.0625);
    }
  });

  it('enables the channels the region expects to be on', () => {
    const result = planWrite({region: 'EU868'}, {region: 'IN865'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      const enabled = channelsOf(result.plan)
        .filter(c => c.enable)
        .map(c => c.value);
      expect(enabled).toEqual([865.0625, 865.4025, 865.985]);
    }
  });

  it('writes the region RX2 frequency and rate, not the old ones', () => {
    // Found on hardware 2026-09-30, one field along from the channels bug:
    // "RX2 Frequency Valid Range: 865000000 - 867000000" on a device left on
    // IN865 carrying EU868's 869525000. The firmware derived RX2 on one region
    // change and not the next, so it is written explicitly.
    const result = planWrite({region: 'EU868'}, {region: 'IN865'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.fields).toHaveProperty(
        ['pLoRaWANParams', 'window2Freq'],
        866550000,
      );
      expect(result.plan.fields).toHaveProperty(
        ['pLoRaWANParams', 'window2Dr'],
        2,
      );
    }
  });

  it.each([
    ['EU868', 869525000],
    ['IN865', 866550000],
    ['RU864', 869100000],
  ] as const)('puts %s RX2 inside its own channel range', (region, rx2) => {
    const result = planWrite({region: null}, {region});

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const limits = LIMITS[region]!;
    expect(rx2 / 1e6).toBeGreaterThanOrEqual(limits[0]);
    expect(rx2 / 1e6).toBeLessThanOrEqual(limits[1]);
    expect(result.plan.fields).toHaveProperty(
      ['pLoRaWANParams', 'window2Freq'],
      rx2,
    );
  });

  it('moves D2D with RX2 without flattening the rest of it', () => {
    const result = planWrite(
      {
        region: 'EU868',
        d2dCfg: {
          enable: true,
          enableMaster: true,
          freq: 869525000,
          dr: 0,
        },
      },
      {region: 'IN865'},
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.fields).toHaveProperty(['pLoRaWANParams', 'd2dCfg'], {
        enable: true,
        enableMaster: true,
        freq: 866550000,
        dr: 2,
      });
    }
  });

  it('leaves D2D alone when the device reports none', () => {
    const result = planWrite({region: 'EU868'}, {region: 'IN865'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.fields.pLoRaWANParams).not.toHaveProperty('d2dCfg');
    }
  });

  it('verifies RX2 on the read-back, but not the array-valued fields', () => {
    // `unappliedFields` compares with !==, so an array or object would always
    // look unapplied. Only scalars belong in `expect`.
    const result = planWrite({region: 'EU868'}, {region: 'IN865'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.expect).toEqual({
        freqRegion: 8,
        window2Freq: 866550000,
        window2Dr: 2,
      });
    }
  });

  it('writes the adaptive fields without promising them', () => {
    // ADR moves dataRate and txPower on its own, so verifying them fires a
    // "may not have applied" warning on a write that did nothing wrong. They
    // are still sent, for a device that does honour them.
    const result = planWrite({region: 'EU868'}, {region: 'IN865'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      const lora = result.plan.fields.pLoRaWANParams as Record<string, unknown>;
      expect(lora).toHaveProperty('dataRate', 2);
      expect(lora).toHaveProperty('txPower', 0);
      expect(result.plan.expect).not.toHaveProperty('dataRate');
      expect(result.plan.expect).not.toHaveProperty('txPower');
    }
  });

  it.each(Object.keys(LIMITS))(
    'writes the whole region-scoped set for %s, not just the channels',
    region => {
      // Being reactive cost two broken sensors: channels first, then RX2. The
      // vendor app re-populates every field on its LoRaWAN page when the
      // Support Frequency changes, and so does this.
      const result = planWrite({region: null}, {region: region as never});

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      const lora = result.plan.fields.pLoRaWANParams as Record<string, unknown>;

      for (const field of [
        'freqRegion',
        'freqs',
        'window2Freq',
        'window2Dr',
        'dataRate',
        'txPower',
      ]) {
        expect(lora).toHaveProperty(field);
      }
    },
  );

  it.each(Object.keys(LIMITS))('uses a data rate %s allows', region => {
    // DR0-5 across the EU group; AS923 starts at DR2 (getDataRateOptions).
    const lowest = region === 'AS923' ? 2 : 0;
    const result = planWrite({region: null}, {region: region as never});

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const lora = result.plan.fields.pLoRaWANParams as Record<string, number>;
    expect(lora.dataRate).toBeGreaterThanOrEqual(lowest);
    expect(lora.dataRate).toBeLessThanOrEqual(5);
    // Index 0 is the region maximum and the one entry every region defines.
    expect(lora.txPower).toBe(0);
  });

  it('refuses a region whose channels are index ranges, not a list', () => {
    // CN470 describes channels as "470.3 - 473.3 / index 0 - 15". Guessing that
    // encoding is how a sensor ends up unreachable.
    const result = planWrite({region: 'EU868'}, {region: 'CN470'});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('index range');
    }
  });

  it('refuses when the sensor is in single-channel mode', () => {
    const result = planWrite(
      {region: 'EU868', singleChannelMode: true},
      {region: 'IN865'},
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('single-channel');
    }
  });
});

describe('planWrite — warning about what else a region change does', () => {
  it('warns that a region change resets the LoRaWAN settings', () => {
    // Milesight's own app warns before writing a region, and the SDK carries
    // the string: setting.changeFreqRegionTip. The AppKey is inside the group
    // it says reverts, so a silent region write can strand a sensor off the
    // network.
    const result = planWrite({region: 'EU868'}, {region: 'IN865'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.warnings).toHaveLength(1);
      expect(result.plan.warnings[0]).toContain('AppKey');
      expect(result.plan.warnings[0]).toContain('provisioned again');
    }
  });

  it('does not warn when nothing is being changed', () => {
    const result = planWrite({region: 'EU868'}, {region: 'EU868'});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.warnings).toEqual([]);
    }
  });
});

describe('planWrite — reporting interval', () => {
  it('writes the interval at the top level, not under pLoRaWANParams', () => {
    // reportingInterval is not in the SDK's LORA_PARAMS_KEYS, so nesting it
    // would be the same silent no-op the region change hit.
    const result = planWrite(
      {region: 'EU868', reportingIntervalSeconds: 600},
      {reportingIntervalSeconds: 120},
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.fields).toEqual({reportingInterval: 120});
      expect(result.plan.expect).toEqual({reportingInterval: 120});
    }
  });

  it('describes the change in minutes for the dialog', () => {
    const result = planWrite(
      {region: 'EU868', reportingIntervalSeconds: 600},
      {reportingIntervalSeconds: 120},
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.summary[0]).toBe('Reporting interval: 10 min → 2 min');
    }
  });

  it('warns that the gateway can change it back (REQ-A-12)', () => {
    const result = planWrite(
      {region: 'EU868', reportingIntervalSeconds: 600},
      {reportingIntervalSeconds: 120},
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.warnings.join(' ')).toContain('downlink');
    }
  });

  it('plans nothing when the interval already matches', () => {
    const result = planWrite(
      {region: 'EU868', reportingIntervalSeconds: 600},
      {reportingIntervalSeconds: 600},
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(isEmptyPlan(result.plan)).toBe(true);
    }
  });

  it.each([0, 30, 100000, 90.5])('refuses an out-of-range %s', seconds => {
    const result = planWrite(
      {region: 'EU868', reportingIntervalSeconds: 600},
      {reportingIntervalSeconds: seconds},
    );

    expect(result.ok).toBe(false);
  });

  it('refuses to write when the device declares its own unit', () => {
    // The seconds assumption is evidence-based, not universal. A device that
    // states its unit is one the evidence does not cover, and guessing wrong
    // changes the reporting rate sixty-fold.
    const result = planWrite(
      {
        region: 'EU868',
        reportingIntervalSeconds: 600,
        reportingIntervalUnit: 1,
      },
      {reportingIntervalSeconds: 120},
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('unit');
    }
  });

  it('writes a region and an interval together', () => {
    const result = planWrite(
      {region: 'EU868', reportingIntervalSeconds: 600},
      {region: 'IN865', reportingIntervalSeconds: 120},
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      // One nested, one flat — in the same settings object.
      expect(result.plan.fields).toHaveProperty(
        ['pLoRaWANParams', 'freqRegion'],
        8,
      );
      expect(result.plan.fields).toHaveProperty('reportingInterval', 120);
      expect(result.plan.warnings).toHaveLength(2);
    }
  });
});

describe('planWrite — regions it must refuse', () => {
  it.each(['US915', 'AU915'] as const)(
    'refuses %s rather than writing a region without its sub-band',
    region => {
      const result = planWrite({region: 'EU868'}, {region});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('sub-band');
      }
    },
  );

  it('does not emit any field when it refuses', () => {
    const result = planWrite({region: 'EU868'}, {region: 'US915'});

    expect(result).not.toHaveProperty('plan');
  });
});

describe('unappliedFields — verification after the write', () => {
  it('reports nothing when the device confirms every value', () => {
    expect(
      unappliedFields({freqRegion: 4}, {freqRegion: 4, model: 'X'}),
    ).toEqual([]);
  });

  it('reports a field the device did not take', () => {
    expect(unappliedFields({freqRegion: 4}, {freqRegion: 0})).toEqual([
      'freqRegion',
    ]);
  });

  it('reports a field missing from the read-back entirely', () => {
    expect(unappliedFields({freqRegion: 4}, {})).toEqual(['freqRegion']);
  });

  it('checks every field that was written', () => {
    expect(
      unappliedFields({freqRegion: 4, channelPlan: 0}, {freqRegion: 4}),
    ).toEqual(['channelPlan']);
  });
});
