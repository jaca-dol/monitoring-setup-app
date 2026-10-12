import React, {useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';

import {colors, radius} from '../theme';

/**
 * The "hold your phone here" loop shown while an NFC scan is waiting for a tag.
 *
 * The movement is the **tap gesture**, the one people already make paying at a
 * terminal: the phone starts upright and tips *forward*, laying its back toward
 * the sensor, then returns.
 *
 * That is a rotation about the horizontal axis — `rotateX` — with a
 * `perspective` ahead of it in the transform list. Both parts are load-bearing:
 *
 * - Plain `rotate` is rotation about Z, which spins the phone in the plane of
 *   the screen. That is a sideways lean, not a forward tip.
 * - `rotateX` **without** `perspective` has no vanishing point, so it collapses
 *   into a vertical squash rather than reading as depth. `perspective` must
 *   come first in the array; RN applies the transforms in order.
 *
 * The screen starts blue and turns white as it tips — as an **angular wipe
 * pinned to the top-right corner, sweeping anticlockwise**, so the white
 * arrives from the corner leading the movement. It stops short of fully white,
 * which keeps the phone reading as a screen rather than a blank card.
 *
 * ─── How the wipe is done ───
 *
 * There is no gradient or mask here, and no drawing library. A white rectangle
 * fills the lower half of a large square whose centre sits exactly on the
 * screen's top-right corner. Rotating that square sweeps the straight edge of
 * the white half-plane around the corner point, and the screen's `overflow:
 * hidden` clips it to the glass.
 *
 * The rotation runs 180° → 115°: at 180° the white half-plane lies entirely
 * above the corner and none of the screen is covered; at 90° it would cover
 * all of it. Stopping at 115° is what "not fully white" means in degrees.
 *
 * ─── Why this is transforms and opacity only ───
 *
 * React Native has two animation drivers. The **JS driver** computes each frame
 * in JavaScript and can animate anything, colours included — and stalls
 * whenever the JS thread is busy. The **native driver** hands the animation to
 * the UI thread once and is immune to that, but only supports `transform` and
 * `opacity`.
 *
 * This animation plays *during* an NFC exchange, which is exactly when our JS
 * thread is busiest: the SDK is running transceives, retries and progress
 * events throughout. On the JS driver it would stutter or freeze at the moment
 * it is meant to say "the app is still working" — and a frozen scan animation
 * reads as a crash.
 *
 * So the colour change is **not** an animated `backgroundColor` — that is a JS
 * driver property. It is a rotation of a white shape over a blue ground, which
 * is a transform. Same picture, native driver throughout.
 *
 * Drawn with plain `View`s, like `Icon.tsx`, rather than pulling in an SVG or
 * animation dependency for one illustration.
 *
 * This is a *waiting* animation, not progress. It says the app is listening; it
 * never implies advancement. The progress bar in `NfcSheet` stays unanimated
 * for the opposite reason — the SDK already smooths its steps, and a bar that
 * creeps on its own makes a stalled exchange look alive.
 */
export function NfcScanAnimation({
  /** Run the loop. False parks it in the resting position. */
  active = true,
}: {
  active?: boolean;
}): React.JSX.Element {
  const travel = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  // Someone who has asked the OS for less movement gets the still frame. The
  // sheet's text already says what is happening, so nothing is lost.
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (alive) {
        setReduceMotion(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => {
        if (alive) {
          setReduceMotion(enabled);
        }
      },
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!active || reduceMotion) {
      travel.stopAnimation();
      travel.setValue(0);
      return;
    }

    // Tip in, hold against the tag, lift away, pause. The hold is what makes it
    // read as a tap rather than a rocking motion.
    //
    // `Easing.quad` is arithmetic (t * t). `Easing.ease` and friends are built
    // on `Easing.bezier`, which is not available under the React Native Jest
    // preset and crashed an earlier version of this component with
    // "_bezier is not a function". Quad both looks right for a hand movement
    // and keeps this testable.
    const tap = Animated.sequence([
      Animated.timing(travel, {
        toValue: 1,
        duration: 700,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(450),
      Animated.timing(travel, {
        toValue: 0,
        duration: 600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(350),
    ]);

    const loop = Animated.loop(tap);
    loop.start();
    return () => {
      loop.stop();
    };
  }, [active, reduceMotion, travel]);

  // Upright, then tipped forward onto the sensor.
  const tilt = travel.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${TILT_DEGREES}deg`],
  });

  // The tip also carries the phone in, the way a hand does.
  const approach = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PHONE_APPROACH],
  });

  // The white half-plane sweeping anticlockwise about the top-right corner.
  const wipe = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [`${WIPE_FROM}deg`, `${WIPE_TO}deg`],
  });

  // The sensor's field answers the phone: brightest when the phone is closest,
  // which is now the end of the tip rather than the start.
  const fieldOpacity = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.95],
  });

  return (
    // Decorative: the sheet's title and body already say this in words, and a
    // screen reader should not have to listen to a picture.
    <View
      style={styles.stage}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden>
      <View style={styles.sensor}>
        <Animated.View style={[styles.field, {opacity: fieldOpacity}]} />
        <View style={styles.tag} />
      </View>

      <Animated.View
        style={[
          styles.phone,
          {
            transform: [
              // Perspective first, or rotateX has no vanishing point and reads
              // as a vertical squash instead of a forward tip.
              {perspective: PERSPECTIVE},
              {translateY: approach},
              {rotateX: tilt},
            ],
          },
        ]}>
        <View style={styles.screen}>
          <Animated.View style={[styles.wipe, {transform: [{rotate: wipe}]}]}>
            <View style={styles.wipeFill} />
          </Animated.View>
        </View>
        <View style={styles.notch} />
      </Animated.View>
    </View>
  );
}

const PHONE_W = 52;
const PHONE_H = 92;
const PHONE_BORDER = 2;
const PHONE_PADDING = 3;

/** The glass inside the bezel — the wipe is clipped to this. */
const SCREEN_W = PHONE_W - 2 * (PHONE_BORDER + PHONE_PADDING);
const SCREEN_H = PHONE_H - 2 * (PHONE_BORDER + PHONE_PADDING);

/**
 * How far the phone tips forward, how far it travels in as it does, and the
 * viewing distance that gives the tip its depth. A smaller perspective value is
 * a wider lens and a more pronounced foreshortening.
 */
const TILT_DEGREES = 52;
const PHONE_APPROACH = 12;
const PERSPECTIVE = 420;

/**
 * The wipe square, big enough that its half-plane still covers the glass at any
 * rotation: twice the screen diagonal, so a full turn never exposes an edge.
 */
const WIPE_SIZE = Math.ceil(2 * Math.hypot(SCREEN_W, SCREEN_H));

/**
 * 180° leaves the screen untouched (all blue); 90° would cover it entirely.
 * Stopping at 115° is "turns white, but not fully".
 */
const WIPE_FROM = 180;
const WIPE_TO = 115;

/**
 * The lit screen, deliberately *not* the brand navy.
 *
 * This stands for a phone screen glowing during a scan, not for a dol-sensors
 * surface, and the brand navy read as a dark slab at this size. A pale blue
 * also leaves the white wipe visible as a soft change rather than a hard
 * dark-to-light edge — the wipe should feel like light spreading, not like a
 * panel sliding across.
 *
 * Local to this illustration on purpose: it is not a design token, and putting
 * it in the theme would invite its use as one.
 */
const SCREEN_BLUE = '#A8DFFA';

const styles = StyleSheet.create({
  stage: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },

  sensor: {
    width: 96,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#DDE2E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** The contactless field, as a ring around the tag. */
  field: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: colors.navySoft,
  },
  tag: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.navy,
  },

  phone: {
    position: 'absolute',
    bottom: 34,
    width: PHONE_W,
    height: PHONE_H,
    borderRadius: 11,
    borderWidth: PHONE_BORDER,
    borderColor: colors.ink,
    backgroundColor: colors.card,
    padding: PHONE_PADDING,
  },
  screen: {
    flex: 1,
    borderRadius: radius.button / 2,
    // The screen starts blue; the wipe brings the white.
    backgroundColor: SCREEN_BLUE,
    overflow: 'hidden',
  },

  /**
   * Centred exactly on the glass's top-right corner, so rotating it pivots the
   * white edge about that corner rather than about the middle of the screen.
   */
  wipe: {
    position: 'absolute',
    left: SCREEN_W - WIPE_SIZE / 2,
    top: -WIPE_SIZE / 2,
    width: WIPE_SIZE,
    height: WIPE_SIZE,
  },
  /** The lower half of that square: one straight edge through the pivot. */
  wipeFill: {
    position: 'absolute',
    top: WIPE_SIZE / 2,
    left: 0,
    width: WIPE_SIZE,
    height: WIPE_SIZE / 2,
    backgroundColor: colors.card,
  },
  notch: {
    position: 'absolute',
    alignSelf: 'center',
    top: 6,
    width: 16,
    height: 3,
    borderRadius: 2,
    // Was the divider grey, which disappeared once the screen went pale blue.
    backgroundColor: colors.navySoft,
  },
});
