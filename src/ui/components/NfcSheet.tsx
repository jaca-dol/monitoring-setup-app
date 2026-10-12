import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import type {NfcProgress} from '../../transport/nfc/progress';
import {colors, spacing} from '../theme';

import {NfcScanAnimation} from './NfcScanAnimation';
import {SheetButton, SheetShell} from './SheetShell';

/**
 * The NFC sheet Android does not provide.
 *
 * iOS shows a system Core NFC sheet during a scan, which is why the vendor app
 * appears to have this for free on an iPhone. On Android the only feedback is
 * the handset's tag-discovery vibration, so the app has to draw its own or the
 * user is left guessing whether anything is happening.
 *
 * What it has to communicate, in order of how often it matters:
 *
 * 1. **Waiting** — armed, nothing found. The commonest state, and the one with
 *    no system cue at all. Says where to hold the phone.
 * 2. **Working** — a tag is being read, with real progress. Reads take up to
 *    ~13 s on a UC501, which is long enough that a bare spinner reads as a
 *    hang.
 * 3. **Done or failed** — resolved, with a reason.
 *
 * Progress is only ever driven by the SDK's own step counter. There is no
 * synthetic creeping bar: a stalled exchange should look stalled.
 */
export function NfcSheet({
  progress,
  visible,
  onCancel,
}: {
  progress: NfcProgress;
  visible: boolean;
  onCancel: () => void;
}): React.JSX.Element {
  // Not animated on purpose. The SDK's tracker already smooths large jumps
  // before it emits them (its "平滑过渡" steps), so animating again would
  // double-smooth and make a stalled exchange look like it is still moving.
  const percent =
    progress.fraction === null ? null : Math.round(progress.fraction * 100);

  return (
    // Shares the chrome — and the animation — with every other sheet. The
    // corner close, grabber and backdrop behaviour all come from SheetShell.
    <SheetShell
      visible={visible}
      title={
        progress.phase === 'working'
          ? workingTitle(progress.command)
          : TITLE[progress.phase]
      }
      body={BODY[progress.phase]}
      onClose={onCancel}>
      <>
        {progress.phase === 'working' && (
          <>
            <View style={styles.track}>
              <View style={[styles.fill, {width: `${percent ?? 0}%`}]} />
            </View>
            <Text style={styles.percent}>
              {percent === null ? '' : `${percent}%`}
            </Text>
          </>
        )}

        {/*
            Waiting gets the animation rather than a bar. There is no progress
            to report yet — the phone is listening — and a bar implies movement
            toward something.
          */}
        {progress.phase === 'waiting' && <NfcScanAnimation />}

        {/*
            A step failed but the operation is still running — on a UC501's
            first read of a session that is the IPSOv2 probe timing out before
            the legacy path takes over. Worth acknowledging so a pause does not
            look like a hang, but it is not a failure.
          */}
        {progress.phase === 'working' && progress.notice !== null && (
          <Text style={styles.notice}>
            First attempt did not answer — retrying.
          </Text>
        )}

        {progress.phase === 'error' && progress.message !== null && (
          <Text style={styles.error}>{progress.message}</Text>
        )}

        <SheetButton
          label={
            progress.phase === 'error' || progress.phase === 'success'
              ? 'Close'
              : 'Cancel'
          }
          onPress={onCancel}
        />
      </>
    </SheetShell>
  );
}

/**
 * The SDK names the command it is running, so the sheet can say what is
 * happening rather than always claiming to be reading. An unrecognised command
 * falls back to neutral wording instead of asserting the wrong thing.
 */
const COMMAND_VERB: Record<string, string> = {
  readFlash: 'Reading sensor',
  readCard: 'Reading sensor',
  powerOn: 'Switching the sensor on',
  powerOff: 'Switching the sensor off',
  restart: 'Restarting the sensor',
  writeFlash: 'Writing to sensor',
};

function workingTitle(command: string | null): string {
  if (command === null) {
    return 'Working';
  }
  return COMMAND_VERB[command] ?? 'Talking to the sensor';
}

const TITLE: Record<NfcProgress['phase'], string> = {
  idle: 'Ready',
  waiting: 'Looking for a sensor',
  working: 'Reading sensor',
  success: 'Done',
  error: 'Could not reach the sensor',
};

const BODY: Record<NfcProgress['phase'], string> = {
  idle: '',
  waiting:
    'Hold the phone flat against the sensor. On most Android phones the NFC antenna is in the upper third of the back.',
  working: 'Keep the phone still until this finishes.',
  success: 'The sensor has been read.',
  error: '',
};

// Chrome — backdrop, sheet, grabber, close, title, body — lives in SheetShell.
const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.divider,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  fill: {height: 6, borderRadius: 3, backgroundColor: colors.navy},
  percent: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  notice: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.amberText,
    marginTop: spacing.sm,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.red,
    marginTop: spacing.sm,
  },
});
