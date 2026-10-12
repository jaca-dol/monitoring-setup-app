import React from 'react';
import ReactTestRenderer, {type ReactTestInstance} from 'react-test-renderer';

import {SECTION_HELP} from '../src/domain/help';
import {SECTION_ORDER, SECTION_TITLES} from '../src/domain/screen';
import {HelpfulSectionHeading} from '../src/ui/components/primitives';
import {PREVIEW_MODELS} from '../src/ui/preview/previewModels';
import {DeviceScreen} from '../src/ui/screens/DeviceScreen';

/**
 * The `?` is the one place an unsure installer looks. What matters is that it
 * is reachable, that it answers the question it implies, and that the copy does
 * not claim the app knows things it cannot.
 */

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(() => {
  ReactTestRenderer.act(() => {
    for (const tree of mounted.splice(0)) {
      tree.unmount();
    }
  });
});

function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  mounted.push(tree);
  return tree;
}

function pressableByLabel(
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  return tree.root.find(
    (node: ReactTestInstance) =>
      typeof node.type !== 'string' &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  );
}

describe('SECTION_HELP content', () => {
  it.each(SECTION_ORDER)('says what %s is for and what it shows', section => {
    const help = SECTION_HELP[section];

    expect(help.purpose.length).toBeGreaterThan(20);
    expect(help.shows.length).toBeGreaterThan(0);
  });

  it('offers no actions for the sections that only report', () => {
    // Measurement and Device are read-only; promising an action there would
    // send an installer looking for a control that does not exist.
    expect(SECTION_HELP.measurement.actions).toEqual([]);
    expect(SECTION_HELP.device.actions).toEqual([]);
  });

  it('names the consequence of a region change, not just the control', () => {
    const network = SECTION_HELP.network.actions.join(' ');

    expect(network).toContain('AppKey');
    expect(network).toContain('provisioned again');
  });

  it('warns that the gateway can change the reporting interval back', () => {
    expect(SECTION_HELP.power.actions.join(' ')).toContain('downlink');
  });

  it('does not claim the app can confirm anything with the gateway', () => {
    // REQ-A-16: this app is offline. It reports what the sensor says about
    // itself, and the help text must not imply otherwise.
    expect(SECTION_HELP.network.shows.join(' ')).toContain('sensor’s own');
  });

  it('keeps key material out of the Device copy', () => {
    const device = SECTION_HELP.device.shows.join(' ');

    expect(device).toContain('status only');
    expect(device).not.toMatch(/[0-9a-fA-F]{32}/);
  });
});

describe('HelpfulSectionHeading', () => {
  it('opens the help for its own section', () => {
    const tree = render(
      <HelpfulSectionHeading icon="signal" section="network" />,
    );

    expect(JSON.stringify(tree.toJSON())).not.toContain('What it shows');

    ReactTestRenderer.act(() => {
      pressableByLabel(tree, 'About Network').props.onPress();
    });

    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('What it shows');
    expect(text).toContain('What you can do');
  });

  it('omits the "what you can do" list where there is nothing to do', () => {
    const tree = render(
      <HelpfulSectionHeading icon="gauge" section="measurement" />,
    );

    ReactTestRenderer.act(() => {
      pressableByLabel(tree, 'About Measurement').props.onPress();
    });

    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('What it shows');
    expect(text).not.toContain('What you can do');
  });
});

describe('DeviceScreen — help is reachable from every heading', () => {
  it('gives each section heading its own labelled help control', () => {
    const tree = render(
      <DeviceScreen
        model={PREVIEW_MODELS['em300-th']}
        handlers={{
          onSetPower: () => {},
          onReboot: () => {},
          onChangeRegion: () => {},
          onChangeReportingInterval: () => {},
          onApply: () => {},
        }}
      />,
    );

    // Actions has no heading in the concept layout, so no help control.
    for (const section of SECTION_ORDER.filter(s => s !== 'actions')) {
      expect(() =>
        pressableByLabel(tree, `About ${SECTION_TITLES[section]}`),
      ).not.toThrow();
    }
  });
});
