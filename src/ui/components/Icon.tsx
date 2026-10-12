import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors} from '../theme';

/**
 * Section icons, drawn as views rather than glyphs.
 *
 * The concept screens use Unicode symbols (⏻ ◎ ▮ ◉ ⚡). On Android that does
 * not survive contact with reality:
 *
 * - `⏻` U+23FB lives in Noto Sans Symbols 2, which is not on most handsets, so
 *   it renders as nothing at all.
 * - `◎ ▮ ◉` come from a symbol font — hairline-thin at this size, and they do
 *   not inherit weight.
 * - `⚡` is emoji. It renders from a **colour** font, so it cannot be tinted;
 *   it would stay yellow however the text colour is set.
 *
 * Composing each icon from a few small views fixes all three: every icon is the
 * same navy, the same optical weight, and present on every device. No icon-font
 * or SVG dependency either, which matters while the prototype is still keeping
 * its native dependency list short.
 */

export type IconName = 'power' | 'gauge' | 'chip' | 'signal' | 'battery';

const SIZE = 20;
const STROKE = 2;

export function Icon({
  name,
  color = colors.navy,
}: {
  name: IconName;
  color?: string;
}): React.JSX.Element {
  return <View style={styles.box}>{shapes(name, color)}</View>;
}

function shapes(name: IconName, color: string): React.JSX.Element {
  switch (name) {
    /** Power symbol: a broken ring with a stem through the gap. */
    case 'power':
      return (
        <>
          <View style={[styles.powerRing, {borderColor: color}]} />
          {/* Page-coloured notch cuts the gap in the ring. */}
          <View style={styles.powerNotch} />
          <View style={[styles.powerStem, {backgroundColor: color}]} />
        </>
      );

    /** Bullseye, for the measured value. */
    case 'gauge':
      return (
        <>
          <View style={[styles.gaugeRing, {borderColor: color}]} />
          <View style={[styles.gaugeDot, {backgroundColor: color}]} />
        </>
      );

    /** Chip outline, for device identity. */
    case 'chip':
      return (
        <>
          <View style={[styles.chipOuter, {borderColor: color}]} />
          <View style={[styles.chipInner, {backgroundColor: color}]} />
        </>
      );

    /** Rising bars, for signal. Clearer than a fisheye at this size. */
    case 'signal':
      return (
        <>
          <View style={[styles.bar, styles.bar1, {backgroundColor: color}]} />
          <View style={[styles.bar, styles.bar2, {backgroundColor: color}]} />
          <View style={[styles.bar, styles.bar3, {backgroundColor: color}]} />
        </>
      );

    /**
     * Battery. The concept uses a lightning bolt, but this section shows supply
     * state and battery level, so a battery says what the section contains —
     * and unlike the emoji bolt it can carry the brand navy.
     */
    case 'battery':
      return (
        <>
          <View style={[styles.batteryBody, {borderColor: color}]} />
          <View style={[styles.batteryNub, {backgroundColor: color}]} />
          <View style={[styles.batteryFill, {backgroundColor: color}]} />
        </>
      );
  }
}

const styles = StyleSheet.create({
  box: {width: SIZE, height: SIZE, position: 'relative'},

  powerRing: {
    position: 'absolute',
    left: 2.5,
    top: 3.5,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: STROKE,
  },
  powerNotch: {
    position: 'absolute',
    left: 7,
    top: 1.5,
    width: 6,
    height: 5,
    backgroundColor: colors.page,
  },
  powerStem: {
    position: 'absolute',
    left: 9,
    top: 1.5,
    width: 2,
    height: 8,
    borderRadius: 1,
  },

  gaugeRing: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: STROKE,
  },
  gaugeDot: {
    position: 'absolute',
    left: 7,
    top: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  chipOuter: {
    position: 'absolute',
    left: 2.5,
    top: 2.5,
    width: 15,
    height: 15,
    borderRadius: 3,
    borderWidth: STROKE,
  },
  chipInner: {
    position: 'absolute',
    left: 7.5,
    top: 7.5,
    width: 5,
    height: 5,
    borderRadius: 1,
  },

  bar: {position: 'absolute', bottom: 3, width: 3, borderRadius: 1},
  bar1: {left: 2, height: 5},
  bar2: {left: 7, height: 9},
  bar3: {left: 12, height: 13},

  batteryBody: {
    position: 'absolute',
    left: 1,
    top: 5.5,
    width: 14,
    height: 9,
    borderRadius: 2.5,
    borderWidth: STROKE,
  },
  batteryNub: {
    position: 'absolute',
    left: 16,
    top: 8,
    width: 2.5,
    height: 4,
    borderRadius: 1,
  },
  batteryFill: {
    position: 'absolute',
    left: 3.5,
    top: 8,
    width: 5,
    height: 4,
    borderRadius: 1,
  },
});
