import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import type {TagLocation} from '../../domain/device';
import {colors, radius, spacing} from '../theme';

/**
 * Where to tap this particular sensor, shown once a read has identified it.
 *
 * Deliberately small: it answers one question, and it appears at the point the
 * app can finally answer it — before a read we do not know which device is in
 * the installer's hand, so there is nothing honest to show.
 *
 * ─── Artwork ───
 *
 * Product artwork is Milesight's, and one request covers all three device types
 * including the iDOL53, whose tag is on its UC501 controller. Drop the files in
 * `src/ui/assets/tags/` and add them to `ARTWORK` below.
 *
 * Until then this renders the caption alone. That is the designed fallback, not
 * a broken state: the sentence is the part that has to be right, and for the
 * iDOL53 it is doing work no picture can — telling someone holding a two-part
 * article which half has the tag in it.
 */

/**
 * Keys from `TAG_LOCATIONS` to bundled images. Empty until the artwork lands.
 * `require` rather than `import` because Metro resolves image assets at build
 * time from a literal path.
 */
const ARTWORK: Record<string, ImageSourcePropType> = {
  // uc501: require('../assets/tags/uc501.png'),
  // em500: require('../assets/tags/em500.png'),
  // em300: require('../assets/tags/em300.png'),
};

export function TagLocationHint({
  location,
}: {
  location: TagLocation;
}): React.JSX.Element {
  const artwork =
    location.artworkKey === null ? undefined : ARTWORK[location.artworkKey];

  return (
    <View style={styles.wrap}>
      {artwork === undefined ? (
        <PlaceholderDevice />
      ) : (
        <Image
          source={artwork}
          style={styles.art}
          resizeMode="contain"
          // The caption says the same thing in words.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
      <View style={styles.textWrap}>
        <Text style={styles.label}>Where to tap</Text>
        <Text style={styles.caption}>{location.caption}</Text>
      </View>
    </View>
  );
}

/**
 * A generic sensor with its tag marked, drawn rather than photographed.
 *
 * Stands in until the product artwork lands, so the card is a visual straight
 * away rather than two lines of text that read as a missing image. Generic on
 * purpose — it shows *that* the tag is behind the front face, and the caption
 * carries the per-device detail.
 */
function PlaceholderDevice(): React.JSX.Element {
  return (
    <View
      style={styles.art}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={styles.placeholderBody}>
        <View style={styles.placeholderTag} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bandPillBg,
    borderRadius: radius.card,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  art: {
    width: 52,
    height: 52,
    borderRadius: radius.button / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderBody: {
    width: 34,
    height: 46,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.navy,
    backgroundColor: colors.card,
    alignItems: 'center',
    paddingTop: 9,
  },
  /** The tag, marked where it sits on most of these devices: upper front. */
  placeholderTag: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.navy,
  },
  textWrap: {flex: 1},
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  caption: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.readOnlyPillText,
    marginTop: 2,
  },
});
