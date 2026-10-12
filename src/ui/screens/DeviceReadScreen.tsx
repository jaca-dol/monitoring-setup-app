import React, {useCallback, useRef, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {buildScreenModel} from '../../codec/screenModel';
import {isEmptyPlan, planWrite, type WritePlan} from '../../codec/writePlan';
import type {Region} from '../../domain/device';
import type {DeviceScreenModel} from '../../domain/screen';
import {
  sendDeviceCommand,
  type DeviceCommand,
} from '../../transport/nfc/commands';
import {
  cancelProbeRead,
  describeError,
  probeRead,
} from '../../transport/nfc/probeRead';
import {
  applySettings,
  unappliedFields,
} from '../../transport/nfc/writeSettings';
import {NfcSheet} from '../components/NfcSheet';
import {AppBar, ApplyBar, Banner} from '../components/primitives';
import {useNfcProgress} from '../hooks/useNfcProgress';
import {colors, radius, spacing} from '../theme';

import {DeviceScreen} from './DeviceScreen';

/**
 * Stage 4 — one NFC tap fills the shared screen (REQ-A-06, roadmap task 6).
 *
 * The screen starts empty with a single "Read sensor" action, because there is
 * nothing honest to show before a read. Once a payload arrives it is decoded
 * into a `DeviceScreenModel` and the Stage 3 shell renders it unchanged — the
 * shell has no idea whether its model came from hardware or a fixture.
 *
 * Every NFC operation raises `NfcSheet`, which is the only feedback an Android
 * user gets: iOS draws a system NFC sheet, Android draws nothing but a
 * vibration.
 *
 * Control commands are a single NFC session and update the screen locally —
 * the device's own acknowledgement is the confirmation, so a second tap to
 * re-read would only add latency.
 */
/** A payload flag as a boolean, or undefined when the device did not report it. */
function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

type ReadState =
  | {phase: 'empty'}
  | {phase: 'reading'}
  | {
      phase: 'ready';
      model: DeviceScreenModel;
      elapsedMs: number;
      /** Carried so a post-write rebuild reports AppKey status correctly. */
      removedSecrets: readonly string[];
      /**
       * Whether the device is in single-channel mode. Write-plan input — it
       * changes how many channels a region takes — not something the screen
       * displays, so it stays here rather than in the screen model.
       */
      singleChannelMode: boolean | undefined;
      /** The device's D2D config, whose frequency and rate follow RX2. */
      d2dCfg: unknown;
    }
  | {phase: 'unsupported'; model: string}
  | {phase: 'failed'; message: string};

export function DeviceReadScreen(): React.JSX.Element {
  const [state, setState] = useState<ReadState>({phase: 'empty'});
  const [busy, setBusy] = useState<DeviceCommand | null>(null);
  /** Staged changes, not yet written. Cleared by a successful apply or re-read. */
  const [pendingRegion, setPendingRegion] = useState<Region | null>(null);
  const [pendingInterval, setPendingInterval] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  const {
    progress,
    active,
    fail: failProgress,
    reset: resetProgress,
  } = useNfcProgress();

  /**
   * Set while the user is cancelling.
   *
   * Cancelling makes the SDK's pending `readFlash` settle, but not usefully:
   * it can resolve with an empty payload rather than reject, which `buildScreenModel`
   * then reports as "Unsupported device" — telling the user their sensor is the
   * wrong model when all they did was press Cancel. A ref rather than state so
   * the in-flight `read()` closure sees it without being re-created.
   */
  const cancelledRef = useRef(false);

  /** Aborts whatever the SDK is waiting on and closes the sheet. */
  const cancelNfc = useCallback(() => {
    cancelledRef.current = true;
    void cancelProbeRead();
    resetProgress();
    setState(current =>
      current.phase === 'reading' ? {phase: 'empty'} : current,
    );
  }, [resetProgress]);

  const read = useCallback(async () => {
    cancelledRef.current = false;
    setState({phase: 'reading'});
    try {
      const result = await probeRead();
      // A cancelled read reports nothing at all: no result, no error.
      if (cancelledRef.current) {
        return;
      }
      const model = buildScreenModel({
        payload: result.deviceInfo,
        removedSecrets: result.removedSecrets,
      });
      if (model === null) {
        const raw =
          typeof result.deviceInfo.model === 'string'
            ? result.deviceInfo.model
            : 'unknown';
        setState({phase: 'unsupported', model: raw});
        return;
      }
      setState({
        phase: 'ready',
        model,
        elapsedMs: result.elapsedMs,
        removedSecrets: result.removedSecrets,
        singleChannelMode: asBoolean(result.deviceInfo.singleChannelMode),
        d2dCfg: result.deviceInfo.d2dCfg,
      });
      // Succeeded: close the sheet, the screen beneath carries the result.
      resetProgress();
    } catch (error) {
      if (cancelledRef.current) {
        return;
      }
      const message = describeError(error);
      setState({phase: 'failed', message});
      // Only a rejected promise is a real failure — the SDK's own error event
      // also fires for recoverable steps. Leave the sheet up with the reason.
      failProgress(message);
    }
  }, [failProgress, resetProgress]);

  /**
   * Sends a command. **One tap, no re-read.**
   *
   * An earlier version re-read afterwards "so the screen reflects the device".
   * On hardware that turned a single toggle into two taps, and the vendor app
   * does it in one — the command's own `sendCommand success` acknowledgement is
   * the device confirming, so a second NFC session adds latency and nothing
   * else.
   *
   * `onSuccess` updates the screen locally instead.
   */
  const runCommand = useCallback(
    async (command: DeviceCommand, onSuccess?: () => void) => {
      setBusy(command);
      try {
        await sendDeviceCommand(command);
        onSuccess?.();
      } catch (error) {
        Alert.alert('Command failed', describeError(error));
      } finally {
        resetProgress();
        setBusy(null);
      }
    },
    [resetProgress],
  );

  /** Reflects a confirmed power change without another NFC session. */
  const setPowerStateLocally = useCallback((on: boolean) => {
    setState(current =>
      current.phase === 'ready'
        ? {
            ...current,
            model: {
              ...current.model,
              control: {powerState: on ? 'on' : 'off'},
            },
          }
        : current,
    );
  }, []);

  /**
   * No confirmation dialog, matching the vendor app.
   *
   * Switching a sensor off is reversible with the same control, the toggle
   * already states the intent, and an installer doing this repeatedly does not
   * want a prompt each time. Nothing here is destructive — that is reserved for
   * the factory reset, which this app does not expose at all.
   */
  const onSetPower = useCallback(
    (on: boolean) => {
      void runCommand(on ? 'powerOn' : 'powerOff', () => {
        setPowerStateLocally(on);
      });
    },
    [runCommand, setPowerStateLocally],
  );

  /**
   * Restart keeps its confirmation. Unlike the toggle it is not reversible by
   * repeating it, and it interrupts a device that may be mid-report — so one
   * tap of friction is worth it. Still a single NFC session.
   */
  const onReboot = useCallback(() => {
    Alert.alert('Restart the sensor?', 'The configuration is kept.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Restart',
        onPress: () => {
          void runCommand('restart');
        },
      },
    ]);
  }, [runCommand]);

  /**
   * A region choice is staged, not written. Nothing reaches the device until
   * Apply, so the screen can show what would change and the write stays one
   * deliberate act (REQ-A-13).
   */
  const onChangeRegion = useCallback((region: Region) => {
    setPendingRegion(region);
  }, []);

  const onChangeReportingInterval = useCallback((seconds: number) => {
    setPendingInterval(seconds);
  }, []);

  /**
   * Writes, then verifies — two NFC sessions, not three.
   *
   * `applySettings` already reads the device back to confirm, so the screen is
   * rebuilt from *that* payload rather than asking for yet another tap. Unlike
   * a power toggle, a settings write keeps its verification: a region that
   * silently did not take is the failure REQ-A-13 exists to catch, and the only
   * way to know is to ask the device.
   */
  const applyPlan = useCallback(
    async (
      plan: WritePlan,
      serialNumber: string,
      removedSecrets: readonly string[],
    ) => {
      setApplying(true);
      try {
        const result = await applySettings({
          fields: plan.fields,
          serialNumber,
        });
        // Checked against what a *read* reports, which is flat — not against
        // the nested shape that was written.
        const missed = unappliedFields(plan.expect, result.verified);

        // Rebuild from the verification read rather than tapping again.
        const model = buildScreenModel({
          payload: result.verified,
          removedSecrets,
        });
        if (model !== null) {
          setState({
            phase: 'ready',
            model,
            elapsedMs: result.elapsedMs,
            removedSecrets,
            singleChannelMode: asBoolean(result.verified.singleChannelMode),
            d2dCfg: result.verified.d2dCfg,
          });
        }
        setPendingRegion(null);
        setPendingInterval(null);

        if (missed.length > 0) {
          Alert.alert(
            'Settings may not have applied',
            `The device did not report the new value for: ${missed.join(
              ', ',
            )}. ` + 'Read it again and check before leaving the site.',
          );
        }
      } catch (error) {
        Alert.alert('Write failed', describeError(error));
      } finally {
        resetProgress();
        setApplying(false);
      }
    },
    [resetProgress],
  );

  const onApply = useCallback(() => {
    if (state.phase !== 'ready') {
      return;
    }
    const model = state.model;
    const planned = planWrite(
      {
        region: model.network.region,
        singleChannelMode: state.singleChannelMode,
        d2dCfg: state.d2dCfg,
        reportingIntervalSeconds: model.power.reportingIntervalSeconds,
      },
      {
        region: pendingRegion ?? undefined,
        reportingIntervalSeconds: pendingInterval ?? undefined,
      },
    );

    if (!planned.ok) {
      Alert.alert('Cannot apply this change', planned.reason);
      return;
    }
    if (isEmptyPlan(planned.plan)) {
      Alert.alert('Nothing to apply', 'No settings have been changed.');
      return;
    }

    // Consequences first, then the instruction. A warning placed under "hold
    // the phone against the sensor" is read after the decision, not before it.
    const warnings = planned.plan.warnings;
    const body = [
      planned.plan.summary.join('\n'),
      ...warnings,
      'Hold the phone against the sensor until the write finishes.',
    ].join('\n\n');

    Alert.alert(
      warnings.length > 0 ? 'Apply this change?' : 'Apply these settings?',
      body,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Apply',
          style: warnings.length > 0 ? 'destructive' : 'default',
          onPress: () => {
            void applyPlan(
              planned.plan,
              model.device.identity.serialNumber,
              state.removedSecrets,
            );
          },
        },
      ],
    );
  }, [applyPlan, pendingRegion, pendingInterval, state]);

  const sheet = (
    <NfcSheet
      progress={progress}
      visible={active || busy !== null || applying}
      onCancel={cancelNfc}
    />
  );

  if (state.phase === 'ready') {
    // Show the staged region rather than the device's, so the screen reflects
    // what Apply would write. Nothing has reached the device yet.
    const staged: DeviceScreenModel = {
      ...state.model,
      ...(pendingRegion === null
        ? {}
        : {network: {...state.model.network, region: pendingRegion}}),
      ...(pendingInterval === null
        ? {}
        : {
            power: {
              ...state.model.power,
              reportingIntervalSeconds: pendingInterval,
            },
          }),
    };

    const hasPendingChange =
      (pendingRegion !== null &&
        pendingRegion !== state.model.network.region) ||
      (pendingInterval !== null &&
        pendingInterval !== state.model.power.reportingIntervalSeconds);

    return (
      <View style={styles.root}>
        <DeviceScreen
          model={staged}
          applyEnabled={hasPendingChange && !applying}
          handlers={{
            onSetPower,
            onReboot,
            onChangeRegion,
            onChangeReportingInterval,
            onApply,
          }}
        />
        <View style={styles.rereadBar}>
          {hasPendingChange && (
            <Text style={styles.pending}>
              Not yet written to the sensor. Press Apply sensor settings.
            </Text>
          )}
          <ApplyBar
            label="Read again"
            onPress={() => {
              setPendingRegion(null);
              setPendingInterval(null);
              void read();
            }}
          />
        </View>
        {sheet}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppBar
        title="Read a sensor"
        subtitle="Hold the phone against the NFC area"
      />
      <ScrollView contentContainerStyle={styles.emptyContent}>
        {state.phase === 'failed' && (
          <Banner title="Read failed">{state.message}</Banner>
        )}

        {state.phase === 'unsupported' && (
          <Banner title="Unsupported device">
            This app supports the iDOL53, EM500-CO2-T-H and EM300-TH. The tag
            reported &ldquo;{state.model}&rdquo;.
          </Banner>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void read();
          }}
          disabled={state.phase === 'reading'}
          style={[
            styles.readButton,
            state.phase === 'reading' && styles.readButtonDisabled,
          ]}>
          <Text style={styles.readLabel}>
            {state.phase === 'reading' ? 'Reading...' : 'Read sensor'}
          </Text>
        </Pressable>

        <Text style={styles.hint}>
          A read takes a few seconds, and up to about 15 on an iDOL53. Keep the
          phone still until the sheet closes.
        </Text>
      </ScrollView>
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.page},
  emptyContent: {padding: spacing.md},
  hint: {
    fontSize: 12.5,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.md,
  },
  readButton: {
    backgroundColor: colors.navy,
    borderRadius: radius.button,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  readButtonDisabled: {opacity: 0.45},
  readLabel: {color: '#ffffff', fontSize: 15, fontWeight: '600'},
  rereadBar: {paddingHorizontal: 12, paddingBottom: spacing.md},
  pending: {
    fontSize: 12,
    color: colors.amberText,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
