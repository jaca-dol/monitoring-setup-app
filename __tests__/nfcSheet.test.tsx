import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import type {NfcProgress} from '../src/transport/nfc/progress';
import {NfcSheet} from '../src/ui/components/NfcSheet';

/**
 * The sheet is the only NFC feedback an Android user gets — iOS draws a system
 * sheet, Android draws nothing but a vibration. What matters is that each phase
 * says something true and specific.
 */

/**
 * The waiting sheet runs the scan animation, whose loop holds a timer. Trees
 * are unmounted after each test so a suite does not leave one running.
 */
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(() => {
  ReactTestRenderer.act(() => {
    for (const tree of mounted.splice(0)) {
      tree.unmount();
    }
  });
});

function render(progress: NfcProgress) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <NfcSheet progress={progress} visible onCancel={() => {}} />,
    );
  });
  mounted.push(tree);
  return JSON.stringify(tree.toJSON());
}

/**
 * The bottom button's label. The corner close control also carries the
 * accessibility label "Close", so asserting on the bare word no longer says
 * anything about the button.
 */
function buttonLabel(progress: NfcProgress): string {
  const match = /"children":\["(Cancel|Close)"\]/.exec(render(progress));
  return match?.[1] ?? '';
}

const base: NfcProgress = {
  phase: 'idle',
  fraction: null,
  command: null,
  message: null,
  notice: null,
};

describe('NfcSheet', () => {
  it('tells the user where to hold the phone while waiting', () => {
    const text = render({...base, phase: 'waiting'});

    expect(text).toContain('Looking for a sensor');
    expect(text).toContain('upper third of the back');
  });

  it('shows a percentage once the exchange is under way', () => {
    const text = render({
      ...base,
      phase: 'working',
      fraction: 0.42,
      command: 'readFlash',
    });

    expect(text).toContain('Reading sensor');
    expect(text).toContain('42%');
  });

  it('names the command rather than always claiming to read', () => {
    expect(
      render({...base, phase: 'working', fraction: 0.5, command: 'restart'}),
    ).toContain('Restarting the sensor');

    expect(
      render({...base, phase: 'working', fraction: 0.5, command: 'powerOff'}),
    ).toContain('Switching the sensor off');
  });

  it('falls back to neutral wording for an unrecognised command', () => {
    const text = render({
      ...base,
      phase: 'working',
      fraction: 0.5,
      command: 'somethingNew',
    });

    expect(text).toContain('Talking to the sensor');
  });

  it('shows no percentage label while waiting, since there is no progress yet', () => {
    expect(render({...base, phase: 'waiting'})).not.toMatch(/\d+%"\]/);
  });

  it('shows the scan animation while waiting, and a real bar once working', () => {
    // Waiting has nothing to report but that the phone is listening, so it
    // gets the loop. A bar there would imply movement toward something.
    const waiting = render({...base, phase: 'waiting'});
    expect(waiting).toContain('"accessibilityElementsHidden":true');

    const working = render({
      ...base,
      phase: 'working',
      fraction: 0.42,
      command: 'readFlash',
    });
    expect(working).not.toContain('"accessibilityElementsHidden":true');
    expect(working).toContain('42%');
  });

  it('surfaces the failure reason', () => {
    const text = render({
      ...base,
      phase: 'error',
      message: 'transceive fail',
    });

    expect(text).toContain('Could not reach the sensor');
    expect(text).toContain('transceive fail');
  });

  it('offers Close rather than Cancel once the operation has resolved', () => {
    expect(buttonLabel({...base, phase: 'error', message: 'x'})).toBe('Close');
    expect(buttonLabel({...base, phase: 'success', fraction: 1})).toBe('Close');
    expect(buttonLabel({...base, phase: 'waiting'})).toBe('Cancel');
  });

  it('clamps a progress fraction outside 0-1', () => {
    expect(
      render({...base, phase: 'working', fraction: 1, command: 'readFlash'}),
    ).toContain('100%');
  });

  it('offers a close control in the corner as well as the button', () => {
    const text = render({...base, phase: 'waiting'});

    // The bottom button is a long reach once the sheet has a bar and a
    // message in it, so there is a second way out where people look for it.
    expect(text).toContain('"accessibilityLabel":"Close"');
    expect(buttonLabel({...base, phase: 'waiting'})).toBe('Cancel');
  });

  describe('recoverable steps are not failures', () => {
    it('shows a retry note, not an error, while still working', () => {
      // A UC501's first read of a session: the IPSOv2 probe times out and the
      // SDK emits its error event, then completes over the legacy path.
      const text = render({
        ...base,
        phase: 'working',
        fraction: 0.3,
        command: 'readFlash',
        notice: 'timeout',
      });

      expect(text).toContain('retrying');
      expect(text).not.toContain('Could not reach the sensor');
      expect(
        buttonLabel({
          ...base,
          phase: 'working',
          fraction: 0.3,
          command: 'readFlash',
          notice: 'timeout',
        }),
      ).toBe('Cancel');
    });

    it('does not show the retry note once the operation has failed', () => {
      const text = render({
        ...base,
        phase: 'error',
        message: 'transceive fail',
        notice: 'timeout',
      });

      expect(text).not.toContain('retrying');
      expect(text).toContain('transceive fail');
    });
  });
});
