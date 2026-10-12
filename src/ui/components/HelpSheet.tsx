import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import type {SectionHelp} from '../../domain/help';
import {colors, spacing} from '../theme';

import {SheetButton, SheetShell} from './SheetShell';

/**
 * What a section is for, opened from the `?` beside its heading.
 *
 * Reading, never acting: nothing in here changes a sensor, so it closes with a
 * single Done rather than a Cancel that implies something was pending.
 *
 * The two lists are separated on purpose — "what it shows" answers *am I
 * reading this right*, "what you can do" answers *am I allowed to change it*.
 * Running them together makes an installer hunt for the second.
 */
export function HelpSheet({
  visible,
  title,
  help,
  onClose,
}: {
  visible: boolean;
  /** The section's own title, so the sheet names what it is explaining. */
  title: string;
  help: SectionHelp;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <SheetShell
      visible={visible}
      title={title}
      body={help.purpose}
      onClose={onClose}>
      <ScrollView style={styles.body} bounces={false}>
        <Points heading="What it shows" points={help.shows} />
        {help.actions.length > 0 && (
          <Points heading="What you can do" points={help.actions} />
        )}
      </ScrollView>

      <SheetButton label="Done" onPress={onClose} />
    </SheetShell>
  );
}

function Points({
  heading,
  points,
}: {
  heading: string;
  points: readonly string[];
}): React.JSX.Element {
  return (
    <View style={styles.group}>
      <Text style={styles.heading}>{heading}</Text>
      {points.map(point => (
        <View key={point} style={styles.point}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.pointText}>{point}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {marginTop: spacing.md, maxHeight: 380},
  group: {marginBottom: spacing.md},
  heading: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  point: {flexDirection: 'row', marginTop: 6},
  bullet: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.navySoft,
    width: 14,
  },
  pointText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
});
