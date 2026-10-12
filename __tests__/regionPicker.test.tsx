import React from 'react';
import ReactTestRenderer, {type ReactTestInstance} from 'react-test-renderer';

import type {Region} from '../src/domain/device';
import {
  IntervalPicker,
  IntervalSlider,
  MAX_INTERVAL_MINUTES,
  MIN_INTERVAL_MINUTES,
  clampMinutes,
  formatIntervalLabel,
  minutesFromSeconds,
} from '../src/ui/components/IntervalPicker';
import {RegionPicker} from '../src/ui/components/RegionPicker';
import {PREVIEW_MODELS} from '../src/ui/preview/previewModels';
import {NetworkSection} from '../src/ui/sections/NetworkSection';
import {PowerSection} from '../src/ui/sections/PowerSection';

/**
 * The region control is the first setting the app writes to a device, so what
 * matters is that the installer picks deliberately and that nothing reaches the
 * sensor until Apply.
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

/**
 * Pressable composites, in render order.
 *
 * Composites rather than host nodes: the host `View` carries the accessibility
 * props but not `onPress`, and driving Pressability through synthetic responder
 * events needs a real event object it does not get here. Calling the composite's
 * own `onPress` is what a tap ends up doing anyway.
 */
function buttons(tree: ReactTestRenderer.ReactTestRenderer) {
  const found = tree.root.findAll(
    (node: ReactTestInstance) =>
      typeof node.type !== 'string' &&
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
  );

  // `Pressable` matches more than once — it and its inner wrapper both carry
  // the props — so one button would otherwise appear twice and shift indices.
  const seen = new Set<unknown>();
  return found.filter(node => {
    // A section heading's "?" sits above the rows and would otherwise be the
    // first button in the tree. These tests are about the controls.
    if (String(node.props.accessibilityLabel ?? '').startsWith('About ')) {
      return false;
    }
    if (seen.has(node.props.onPress)) {
      return false;
    }
    seen.add(node.props.onPress);
    return true;
  });
}

function press(node: ReactTestInstance) {
  ReactTestRenderer.act(() => {
    node.props.onPress();
  });
}

const REGIONS: Region[] = ['EU868', 'IN865', 'RU864'];

describe('RegionPicker', () => {
  it('lists every selectable region, not just the alternatives', () => {
    const text = JSON.stringify(
      render(
        <RegionPicker
          visible
          regions={REGIONS}
          current="EU868"
          onSelect={() => {}}
          onCancel={() => {}}
        />,
      ).toJSON(),
    );

    for (const region of REGIONS) {
      expect(text).toContain(region);
    }
  });

  it('marks the current region rather than hiding it', () => {
    const text = JSON.stringify(
      render(
        <RegionPicker
          visible
          regions={REGIONS}
          current="IN865"
          onSelect={() => {}}
          onCancel={() => {}}
        />,
      ).toJSON(),
    );

    expect(text).toContain('✓');
  });

  it('says the choice is not written yet', () => {
    // REQ-A-13: nothing reaches the device until Apply, and the sheet must not
    // imply otherwise.
    const text = JSON.stringify(
      render(
        <RegionPicker
          visible
          regions={REGIONS}
          current="EU868"
          onSelect={() => {}}
          onCancel={() => {}}
        />,
      ).toJSON(),
    );

    expect(text).toContain('does not change the sensor');
  });

  it('reports the region chosen, not merely that something was chosen', () => {
    const chosen: Region[] = [];
    const tree = render(
      <RegionPicker
        visible
        regions={REGIONS}
        current="EU868"
        onSelect={region => chosen.push(region)}
        onCancel={() => {}}
      />,
    );

    // Close, EU868, IN865, RU864, Cancel — pick RU864.
    const ru864 = buttons(tree)[3];
    expect(ru864).toBeDefined();
    press(ru864!);

    expect(chosen).toEqual(['RU864']);
  });
});

describe('interval maths', () => {
  it('holds the slider inside 1–120 whole minutes', () => {
    expect(clampMinutes(0)).toBe(MIN_INTERVAL_MINUTES);
    expect(clampMinutes(-5)).toBe(MIN_INTERVAL_MINUTES);
    expect(clampMinutes(999)).toBe(MAX_INTERVAL_MINUTES);
    expect(clampMinutes(10.4)).toBe(10);
    expect(clampMinutes(Number.NaN)).toBe(MIN_INTERVAL_MINUTES);
  });

  it('starts the slider from the device, clamping what it cannot show', () => {
    expect(minutesFromSeconds(600)).toBe(10);
    // 90 s is not a whole number of minutes, and 10 h is off the scale. The
    // slider rounds and clamps; the sheet still prints the device's real value.
    expect(minutesFromSeconds(90)).toBe(2);
    expect(minutesFromSeconds(36000)).toBe(MAX_INTERVAL_MINUTES);
    expect(minutesFromSeconds(null)).toBe(10);
    expect(minutesFromSeconds(0)).toBe(10);
  });

  it('names intervals the way an installer says them', () => {
    expect(formatIntervalLabel(60)).toBe('1 min');
    expect(formatIntervalLabel(600)).toBe('10 min');
    expect(formatIntervalLabel(3600)).toBe('1 hour');
    expect(formatIntervalLabel(90)).toBe('90 s');
  });
});

describe('IntervalPicker', () => {
  it('opens on the value the device reports', () => {
    const text = JSON.stringify(
      render(
        <IntervalPicker
          visible
          current={600}
          onSelect={() => {}}
          onCancel={() => {}}
        />,
      ).toJSON(),
    );

    expect(text).toContain('Set 10 minutes');
  });

  it('shows the device value when the slider cannot represent it', () => {
    // 10 hours is past the top of the scale — say so rather than silently
    // showing 120 as though that were the sensor's setting.
    const text = JSON.stringify(
      render(
        <IntervalPicker
          visible
          current={36000}
          onSelect={() => {}}
          onCancel={() => {}}
        />,
      ).toJSON(),
    );

    // Interpolated text renders as separate nodes, so assert on the pieces.
    expect(text).toContain('Currently ');
    expect(text).toContain('10 hours');
    expect(text).toContain(' on the sensor');
  });

  it('stages nothing until Set is pressed', () => {
    // Dragging moves a draft. A value that committed on every frame would show
    // sixty pending changes on the screen behind.
    const chosen: number[] = [];
    const tree = render(
      <IntervalPicker
        visible
        current={600}
        onSelect={s => chosen.push(s)}
        onCancel={() => {}}
      />,
    );

    // Close, −, +, Set, Cancel.
    press(buttons(tree)[2]!); // +
    expect(chosen).toEqual([]);

    press(buttons(tree)[3]!); // Set
    expect(chosen).toEqual([660]);
  });

  it('steps a single minute at a time', () => {
    const chosen: number[] = [];
    const tree = render(
      <IntervalPicker
        visible
        current={600}
        onSelect={s => chosen.push(s)}
        onCancel={() => {}}
      />,
    );

    press(buttons(tree)[1]!); // −
    press(buttons(tree)[3]!); // Set

    expect(chosen).toEqual([540]);
  });

  it('reports seconds, since that is what the device stores', () => {
    const chosen: number[] = [];
    const tree = render(
      <IntervalPicker
        visible
        current={120}
        onSelect={s => chosen.push(s)}
        onCancel={() => {}}
      />,
    );

    press(buttons(tree)[3]!); // Set, unchanged

    expect(chosen).toEqual([120]);
  });
});

describe('IntervalSlider', () => {
  it('exposes itself as adjustable, with its range', () => {
    const tree = render(<IntervalSlider minutes={30} onChange={() => {}} />);
    const text = JSON.stringify(tree.toJSON());

    expect(text).toContain('"accessibilityRole":"adjustable"');
    expect(text).toContain('"now":30');
  });

  it('increments and decrements by one minute for a screen reader', () => {
    const seen: number[] = [];
    const tree = render(
      <IntervalSlider minutes={30} onChange={m => seen.push(m)} />,
    );

    const node = tree.root.find(
      (n: ReactTestInstance) =>
        typeof n.type === 'string' &&
        n.props.accessibilityRole === 'adjustable',
    );

    ReactTestRenderer.act(() => {
      node.props.onAccessibilityAction({
        nativeEvent: {actionName: 'increment'},
      });
      node.props.onAccessibilityAction({
        nativeEvent: {actionName: 'decrement'},
      });
    });

    expect(seen).toEqual([31, 29]);
  });
});

describe('PowerSection — choosing an interval', () => {
  it('opens the chooser instead of reporting the interval as read only', () => {
    // REQ-A-12 said read-only; dol-sensors decided otherwise on 2026-09-29.
    const chosen: number[] = [];
    const tree = render(
      <PowerSection
        model={PREVIEW_MODELS['em300-th'].power}
        onChangeReportingInterval={s => chosen.push(s)}
      />,
    );

    const intervalRow = buttons(tree)[0];
    expect(intervalRow).toBeDefined();
    press(intervalRow!);

    expect(chosen).toEqual([]);
    expect(JSON.stringify(tree.toJSON())).toContain('shorten battery life');
  });
});

describe('NetworkSection — choosing a region', () => {
  const model = PREVIEW_MODELS['em300-th'].network;

  it('offers the alternatives by name on the row', () => {
    const text = JSON.stringify(
      render(
        <NetworkSection model={model} onChangeRegion={() => {}} />,
      ).toJSON(),
    );

    expect(text).toContain('Change to IN865 or RU864');
  });

  it('opens a chooser rather than jumping to the first alternative', () => {
    // The old behaviour took alternatives[0] on tap, which with two options
    // silently picked one. Tapping must now offer a choice and report nothing.
    const chosen: Region[] = [];
    const tree = render(
      <NetworkSection model={model} onChangeRegion={r => chosen.push(r)} />,
    );

    const regionRow = buttons(tree)[0];
    expect(regionRow).toBeDefined();
    press(regionRow!);

    expect(chosen).toEqual([]);
    expect(JSON.stringify(tree.toJSON())).toContain(
      'does not change the sensor',
    );
  });
});
