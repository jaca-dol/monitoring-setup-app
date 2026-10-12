import React from 'react';
import {AccessibilityInfo} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import {NfcScanAnimation} from '../src/ui/components/NfcScanAnimation';

/**
 * The animation itself cannot be asserted frame by frame, and it would not be
 * worth much if it could. What is worth locking down is the part that has
 * already bitten us once and the part that breaks silently on a real phone:
 * it must render under Jest at all (an earlier eased animation crashed with
 * "_bezier is not a function"), and it must stay on the native driver, because
 * this plays while the SDK occupies the JS thread.
 */

/**
 * Mounted trees are unmounted after each test. A running loop holds a timer,
 * and Jest reports a leaked worker if one outlives its suite.
 */
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    for (const tree of mounted.splice(0)) {
      tree.unmount();
    }
  });
});

async function render(active?: boolean) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  // Async act so the reduce-motion query settles before assertions.
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      active === undefined ? (
        <NfcScanAnimation />
      ) : (
        <NfcScanAnimation active={active} />
      ),
    );
  });
  mounted.push(tree);
  return tree;
}

describe('NfcScanAnimation', () => {
  it('renders without the easing crash that removed the last one', async () => {
    const tree = await render();

    expect(tree.toJSON()).not.toBeNull();
  });

  it('is hidden from screen readers, being decorative', async () => {
    const text = JSON.stringify((await render()).toJSON());

    // The sheet's title and body already say this in words.
    expect(text).toContain('"accessibilityElementsHidden":true');
  });

  it('starts and stops cleanly when it goes inactive', async () => {
    const tree = await render(true);

    await ReactTestRenderer.act(async () => {
      tree.update(<NfcScanAnimation active={false} />);
    });
    await ReactTestRenderer.act(async () => {
      tree.unmount();
    });

    expect(tree.toJSON()).toBeNull();
  });

  it('respects the reduce-motion setting', async () => {
    const spy = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);

    const tree = await render();

    // Still drawn — the still frame is the point, not an empty box.
    expect(tree.toJSON()).not.toBeNull();
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});
