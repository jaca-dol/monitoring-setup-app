import React from 'react';
import ReactTestRenderer, {type ReactTestInstance} from 'react-test-renderer';

import {SECTION_ORDER, SECTION_TITLES} from '../src/domain/screen';
import {PREVIEW_MODELS} from '../src/ui/preview/previewModels';
import {DeviceScreen} from '../src/ui/screens/DeviceScreen';

/**
 * Stage 3 is the shared shell. The rules worth locking down are the ones the
 * PRD and the concept screens state: section order is identical on every device
 * type, only applicable rows appear, and key material is never rendered.
 * Visual styling is deliberately not asserted.
 */

const handlers = {
  onSetPower: () => {},
  onReboot: () => {},
  onChangeRegion: () => {},
  onChangeReportingInterval: () => {},
  onApply: () => {},
};

function render(model: Parameters<typeof DeviceScreen>[0]['model']) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <DeviceScreen model={model} handlers={handlers} />,
    );
  });
  return tree;
}

/** Section headings, in render order. */
function sectionTitles(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root
    .findAll(
      (node: ReactTestInstance) =>
        // Host elements only. A composite component and the host View it
        // renders both carry the prop, which would double every entry.
        typeof node.type === 'string' &&
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('section:'),
    )
    .map((node: ReactTestInstance) =>
      String(node.props.accessibilityLabel).replace('section:', ''),
    );
}

/** All rendered text, flattened. */
function allText(tree: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(tree.toJSON());
}

describe('DeviceScreen - section order (REQ-A-14)', () => {
  const expected = SECTION_ORDER.map(id => SECTION_TITLES[id]);

  it.each(Object.keys(PREVIEW_MODELS))(
    'renders all six sections in the same order for %s',
    key => {
      const model = PREVIEW_MODELS[key as keyof typeof PREVIEW_MODELS];
      expect(sectionTitles(render(model))).toEqual(expected);
    },
  );
});

describe('DeviceScreen - only applicable rows', () => {
  it('shows the supply row above a backup-labelled battery on the iDOL53', () => {
    const text = allText(render(PREVIEW_MODELS.idol53));

    expect(text).toContain('Supply');
    expect(text).toContain('24 V present');
    expect(text).toContain('Backup battery');
    expect(text).toContain('Not the service life');
  });

  it('omits the supply row and labels the battery plainly on the EM300', () => {
    const text = allText(render(PREVIEW_MODELS['em300-th']));

    expect(text).not.toContain('24 V present');
    expect(text).not.toContain('Backup battery');
    expect(text).toContain('Battery');
  });

  it('shows the configuration row only on the iDOL53', () => {
    expect(allText(render(PREVIEW_MODELS.idol53))).toContain('Configuration');
    expect(allText(render(PREVIEW_MODELS['em500-co2-t-h']))).not.toContain(
      'Configuration',
    );
  });

  it('renders every measured value for a multi-parameter sensor', () => {
    const em500 = allText(render(PREVIEW_MODELS['em500-co2-t-h']));

    for (const value of ['497', '18.5', '60.5', '1003.9']) {
      expect(em500).toContain(value);
    }
  });

  it('explains an empty measurement card rather than showing nothing', () => {
    expect(allText(render(PREVIEW_MODELS.idol53))).toContain(
      'No measurement channel defined',
    );
  });

  it('marks the band group as a pill on the Type row', () => {
    expect(allText(render(PREVIEW_MODELS['em300-th']))).toContain('-868M');
  });
});

describe('DeviceScreen - AppKey is status only (REQ-A-15)', () => {
  it.each(Object.keys(PREVIEW_MODELS))(
    'shows an AppKey status and no value for %s',
    key => {
      const text = allText(
        render(PREVIEW_MODELS[key as keyof typeof PREVIEW_MODELS]),
      );

      expect(text).toContain('AppKey');
      expect(text).toContain('Loaded in production');
      expect(text).toContain('Verified');
      // Nothing key-shaped can reach the screen: the model has no field for it.
      expect(text).not.toMatch(/[0-9a-fA-F]{32}/);
    },
  );
});

describe('DeviceScreen - signal presentation (PRD B5)', () => {
  it('shows the verdict as a pill with the readings beside it', () => {
    const text = allText(render(PREVIEW_MODELS['em500-co2-t-h']));

    expect(text).toContain('Good');
    expect(text).toContain('-86 dBm');
    expect(text).toContain('SNR 11 dB');
  });

  it('shows the usable limit with the readings', () => {
    expect(allText(render(PREVIEW_MODELS['em500-co2-t-h']))).toContain(
      'usable above -100 dBm',
    );
  });

  it('prints "no signal reading" rather than a number for a never-joined device', () => {
    // The UC501 reports rssi 0 before it has ever joined; the model carries
    // null so this cannot render as an excellent signal.
    const text = allText(render(PREVIEW_MODELS.idol53));

    expect(text).toContain('No signal reading');
    expect(text).toContain('Disconnected');
  });

  it('renders a negative SNR without clipping it', () => {
    expect(allText(render(PREVIEW_MODELS['em300-th']))).toContain('SNR -21 dB');
  });

  it('uses Unusable, not the concept screens Marginal, below -100 dBm', () => {
    const text = allText(render(PREVIEW_MODELS['em300-th']));

    expect(text).toContain('Unusable');
    expect(text).not.toContain('Marginal');
  });
});

describe('DeviceScreen - region control (REQ-A-08)', () => {
  it('names the alternatives when the region can be changed', () => {
    expect(allText(render(PREVIEW_MODELS['em500-co2-t-h']))).toContain(
      'Change to IN865 or RU864',
    );
  });

  it('reports without inviting a tap when the region is fixed', () => {
    const fixed = {
      ...PREVIEW_MODELS['em300-th'],
      network: {
        ...PREVIEW_MODELS['em300-th'].network,
        regionIsFixed: true,
        selectableRegions: ['EU868' as const],
      },
    };
    const text = allText(render(fixed));

    expect(text).toContain('Fixed on this hardware');
    expect(text).not.toContain('Change to');
  });
});

describe('DeviceScreen - a switched-off sensor', () => {
  const off = {
    ...PREVIEW_MODELS['em500-co2-t-h'],
    control: {powerState: 'off' as const},
  };

  it('hides the readings rather than showing stale ones', () => {
    const text = allText(render(off));

    // The values are still in the model; they must not reach the screen,
    // because a number on screen reads as "current" whatever labels it.
    for (const value of ['497', '18.5', '60.5', '1003.9']) {
      expect(text).not.toContain(value);
    }
  });

  it('says why there is nothing to show', () => {
    expect(allText(render(off))).toContain('switched off and is not measuring');
  });

  it('still shows the rest of the screen', () => {
    const text = allText(render(off));

    expect(text).toContain('EM500-CO2-T-H');
    expect(text).toContain('DevEUI');
    expect(text).toContain('Battery');
  });

  it('shows the readings again once it is on', () => {
    expect(allText(render(PREVIEW_MODELS['em500-co2-t-h']))).toContain('497');
  });
});

describe('DeviceScreen - where to tap', () => {
  it('names the tap location once the device type is known', () => {
    const text = allText(render(PREVIEW_MODELS['em300-th']));

    expect(text).toContain('Where to tap');
  });

  it('tells an iDOL53 installer to tap the controller, not the sensor', () => {
    // The article has two parts and only the UC501 carries a tag. This sentence
    // does work no product photograph can, so it must not depend on artwork.
    const text = allText(render(PREVIEW_MODELS.idol53));

    expect(text).toContain('UC501 controller');
    expect(text).toContain('not the DOL53');
  });

  it.each(Object.keys(PREVIEW_MODELS))(
    'gives every supported type somewhere to tap: %s',
    key => {
      const model = PREVIEW_MODELS[key as keyof typeof PREVIEW_MODELS];
      expect(allText(render(model))).toContain('Where to tap');
    },
  );
});

describe('DeviceScreen - actions', () => {
  it('offers save, share and the apply bar', () => {
    const text = allText(render(PREVIEW_MODELS.idol53));

    expect(text).toContain('Save to profile');
    expect(text).toContain('Share settings');
    expect(text).toContain('Apply sensor settings');
  });
});
