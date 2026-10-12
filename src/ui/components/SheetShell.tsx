import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import {colors, radius, spacing} from '../theme';

/**
 * The bottom-sheet chrome every staged setting shares: backdrop, grabber, a
 * corner close, a title and a line of explanation.
 *
 * Extracted so a second sheet cannot drift from the first. What goes *inside*
 * differs — a list of choices, a slider — but the frame around it should not.
 *
 * ─── Why the animation is ours and not the Modal's ───
 *
 * `animationType="slide"` animates the Modal's **whole** content, backdrop
 * included, so the dark layer travelled up the screen with the panel. That
 * reads as one sheet of paper sliding in rather than a panel rising over a
 * dimmed screen, which is what everything else on a phone does.
 *
 * So the Modal does no animation at all and the two parts are driven
 * separately: the backdrop fades its opacity in place, the panel translates up
 * from its own height. Both are transforms or opacity, so both run on the
 * native driver.
 *
 * The panel's height is measured rather than assumed, so it starts exactly one
 * panel below the fold instead of travelling a guessed distance and arriving
 * early. The fallback only applies before the first measurement.
 */

const ENTER_MS = 220;
const EXIT_MS = 160;
/** Used only until the panel has been measured once. */
const ASSUMED_SHEET_HEIGHT = 600;

export function SheetShell({
  visible,
  title,
  body,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  body: string;
  onClose: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  // The Modal has to outlive `visible` so the exit animation can play.
  const [mounted, setMounted] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(0);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: EXIT_MS,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [visible, progress]);

  const onSheetLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    if (next > 0 && next !== sheetHeight) {
      setSheetHeight(next);
    }
  };

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight === 0 ? ASSUMED_SHEET_HEIGHT : sheetHeight, 0],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Dims in place. Nothing about it moves. */}
        <Animated.View style={[styles.backdrop, {opacity: progress}]} />

        <Animated.View
          onLayout={onSheetLayout}
          style={[styles.sheet, {transform: [{translateY}]}]}>
          <View style={styles.grabber} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={12}
            style={styles.close}>
            <Text style={styles.closeMark}>✕</Text>
          </Pressable>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** The plain outlined button used at the foot of a sheet. */
export function SheetButton({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean | undefined;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, primary === true && styles.buttonPrimary]}>
      <Text
        style={[styles.buttonLabel, primary === true && styles.buttonLabelOn]}>
        {label}
      </Text>
    </Pressable>
  );
}

export const sheetStyles = StyleSheet.create({
  /** Cap a scrolling body so the buttons stay on a short screen. */
  list: {marginTop: spacing.md, maxHeight: 280},
});

const styles = StyleSheet.create({
  /** Holds the panel at the bottom; the backdrop fills it behind. */
  root: {flex: 1, justifyContent: 'flex-end'},
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,24,40,0.45)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
    marginBottom: spacing.md,
  },
  close: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeMark: {fontSize: 16, color: colors.muted, lineHeight: 18},
  title: {fontSize: 17, fontWeight: '600', color: colors.ink, paddingRight: 32},
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    marginTop: spacing.xs,
  },

  button: {
    marginTop: spacing.sm,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  buttonPrimary: {backgroundColor: colors.navy, borderColor: colors.navy},
  buttonLabel: {fontSize: 15, fontWeight: '500', color: colors.navy},
  buttonLabelOn: {color: '#ffffff', fontWeight: '600'},
});
