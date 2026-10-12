import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import {colors, radius, spacing} from '../theme';

import {SheetButton, SheetShell} from './SheetShell';

/**
 * Choosing the reporting interval, as a 1–120 minute slider.
 *
 * ─── Why this slider is hand-drawn ───
 *
 * React Native removed `Slider` from core; the replacement is
 * `@react-native-community/slider`, a native module that would mean a new
 * dependency and a full Gradle rebuild. This one is `PanResponder` over plain
 * `View`s — the same approach as `Icon` and `NfcScanAnimation` — so it needs no
 * dependency and ships in a JS reload.
 *
 * ─── Why there are also − and + buttons ───
 *
 * 120 steps across a phone-width track is about two pixels per minute. Dragging
 * is the right way to get *near* a value and a hopeless way to land on an exact
 * one, and "every 10 minutes" is the kind of thing an installer is told
 * precisely. The buttons make each minute reachable; the slider makes the range
 * quick to cross.
 *
 * ─── Why it does not commit as you drag ───
 *
 * Dragging moves a draft. Nothing is staged until Set, because a value that
 * changed sixty times on the way past would show sixty pending changes on the
 * screen behind, and because releasing on the wrong minute should be
 * recoverable with Cancel.
 */

export const MIN_INTERVAL_MINUTES = 1;
export const MAX_INTERVAL_MINUTES = 120;

/** Where the slider starts when the device reports nothing usable. */
const FALLBACK_MINUTES = 10;

export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) {
    return MIN_INTERVAL_MINUTES;
  }
  return Math.min(
    MAX_INTERVAL_MINUTES,
    Math.max(MIN_INTERVAL_MINUTES, Math.round(minutes)),
  );
}

/**
 * The slider position for a device already on some interval.
 *
 * A device can sit outside 1–120 minutes, or on a value that is not a whole
 * number of them — the slider cannot represent either, so it clamps and the
 * sheet shows the device's real value separately rather than pretending.
 */
export function minutesFromSeconds(seconds: number | null): number {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) {
    return FALLBACK_MINUTES;
  }
  return clampMinutes(seconds / 60);
}

/** An interval in words, for the value read-out and the current-value line. */
export function formatIntervalLabel(seconds: number): string {
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  if (seconds % 60 === 0) {
    return `${seconds / 60} min`;
  }
  return `${seconds} s`;
}

export function IntervalSlider({
  minutes,
  onChange,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
}): React.JSX.Element {
  const [width, setWidth] = useState(0);

  // Refs because the responder is created once and must not close over a stale
  // width, value or callback.
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const startRef = useRef(minutes);
  onChangeRef.current = onChange;

  const span = MAX_INTERVAL_MINUTES - MIN_INTERVAL_MINUTES;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // A tap jumps to where it landed, then a drag continues from there.
        onPanResponderGrant: event => {
          const w = widthRef.current;
          if (w <= 0) {
            return;
          }
          const next = clampMinutes(
            MIN_INTERVAL_MINUTES +
              (event.nativeEvent.locationX / w) *
                (MAX_INTERVAL_MINUTES - MIN_INTERVAL_MINUTES),
          );
          startRef.current = next;
          onChangeRef.current(next);
        },
        onPanResponderMove: (_event, gesture) => {
          const w = widthRef.current;
          if (w <= 0) {
            return;
          }
          onChangeRef.current(
            clampMinutes(
              startRef.current +
                (gesture.dx / w) *
                  (MAX_INTERVAL_MINUTES - MIN_INTERVAL_MINUTES),
            ),
          );
        },
      }),
    [],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    widthRef.current = next;
    setWidth(next);
  };

  const fraction = (minutes - MIN_INTERVAL_MINUTES) / span;

  return (
    <View
      onLayout={onLayout}
      style={styles.sliderHit}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Reporting interval in minutes"
      accessibilityValue={{
        min: MIN_INTERVAL_MINUTES,
        max: MAX_INTERVAL_MINUTES,
        now: minutes,
      }}
      accessibilityActions={[{name: 'increment'}, {name: 'decrement'}]}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === 'increment') {
          onChange(clampMinutes(minutes + 1));
        } else if (event.nativeEvent.actionName === 'decrement') {
          onChange(clampMinutes(minutes - 1));
        }
      }}
      {...responder.panHandlers}>
      <View style={styles.track}>
        <View style={[styles.fill, {width: `${fraction * 100}%`}]} />
      </View>
      {width > 0 && (
        <View
          style={[styles.thumb, {left: fraction * width - THUMB / 2}]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

export function IntervalPicker({
  visible,
  current,
  onSelect,
  onCancel,
}: {
  visible: boolean;
  /** Seconds, as the device reports it. */
  current: number | null;
  onSelect: (seconds: number) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState(() => minutesFromSeconds(current));

  // Reopening starts from the device again, not from last time's abandoned drag.
  useEffect(() => {
    if (visible) {
      setDraft(minutesFromSeconds(current));
    }
  }, [visible, current]);

  const draftSeconds = draft * 60;
  const differs = current !== null && current !== draftSeconds;

  return (
    <SheetShell
      visible={visible}
      title="Reporting interval"
      body="How often the sensor sends a reading. Shorter intervals shorten battery life. Choosing here does not change the sensor — it is written when you apply the settings."
      onClose={onCancel}>
      <View style={styles.readout}>
        <Text style={styles.value}>{draft}</Text>
        <Text style={styles.unit}>{draft === 1 ? 'minute' : 'minutes'}</Text>
      </View>

      {differs && (
        <Text style={styles.currently}>
          Currently {formatIntervalLabel(current)} on the sensor
        </Text>
      )}

      <IntervalSlider minutes={draft} onChange={setDraft} />

      <View style={styles.scale}>
        <Text style={styles.scaleEnd}>{MIN_INTERVAL_MINUTES} min</Text>
        <Text style={styles.scaleEnd}>{MAX_INTERVAL_MINUTES} min</Text>
      </View>

      <View style={styles.steppers}>
        <Stepper
          label="−"
          accessibilityLabel="One minute less"
          disabled={draft <= MIN_INTERVAL_MINUTES}
          onPress={() => setDraft(clampMinutes(draft - 1))}
        />
        <Stepper
          label="+"
          accessibilityLabel="One minute more"
          disabled={draft >= MAX_INTERVAL_MINUTES}
          onPress={() => setDraft(clampMinutes(draft + 1))}
        />
      </View>

      <SheetButton
        primary
        label={`Set ${draft} ${draft === 1 ? 'minute' : 'minutes'}`}
        onPress={() => onSelect(draftSeconds)}
      />
      <SheetButton label="Cancel" onPress={onCancel} />
    </SheetShell>
  );
}

function Stepper({
  label,
  accessibilityLabel,
  onPress,
  disabled,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={[styles.stepper, disabled && styles.stepperOff]}>
      <Text style={styles.stepperLabel}>{label}</Text>
    </Pressable>
  );
}

const THUMB = 26;

const styles = StyleSheet.create({
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  value: {
    fontSize: 40,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -1,
  },
  unit: {fontSize: 15, color: colors.muted, marginLeft: 6},
  currently: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 2,
  },

  // Tall enough to be draggable with a thumb, not just a 6pt bar.
  sliderHit: {height: 44, justifyContent: 'center', marginTop: spacing.md},
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.divider,
    overflow: 'hidden',
  },
  fill: {height: 6, borderRadius: 3, backgroundColor: colors.navy},
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: colors.navy,
  },

  scale: {flexDirection: 'row', justifyContent: 'space-between'},
  scaleEnd: {fontSize: 11, color: colors.muted},

  steppers: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  stepper: {
    width: 64,
    height: 40,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperOff: {opacity: 0.35},
  stepperLabel: {fontSize: 20, fontWeight: '600', color: colors.navy},
});
