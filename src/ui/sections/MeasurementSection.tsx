import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import type {MeasurementModel} from '../../domain/screen';
import {Card, HelpfulSectionHeading} from '../components/primitives';
import {colors, spacing} from '../theme';

/**
 * Measurement — the last value(s) the sensor measured, with the time read
 * (REQ-A-07). The app opens on this.
 *
 * The concept screens use one card with two modes, and the callout table says
 * why: a single hero value for a one-parameter sensor, and a side-by-side row
 * for a multi-parameter one, because "one hero value would hide the others".
 * Both are centred, with a divider above the timestamp.
 */
export function MeasurementSection({
  model,
  emptyMessage,
}: {
  model: MeasurementModel;
  emptyMessage?: string | undefined;
}): React.JSX.Element {
  const readings = model.readings;

  return (
    <>
      <HelpfulSectionHeading icon="gauge" section="measurement" />
      <Card>
        <View style={styles.pad}>
          {readings.length === 0 ? (
            <Text style={styles.empty}>
              {emptyMessage ?? 'No measurements reported.'}
            </Text>
          ) : readings.length === 1 ? (
            <Hero
              value={readings[0]?.value ?? null}
              unit={readings[0]?.unit ?? ''}
              label={readings[0]?.label ?? ''}
            />
          ) : (
            <View style={styles.trio}>
              {readings.map(reading => (
                <View key={reading.key} style={styles.trioItem}>
                  <Text style={styles.trioValue}>
                    {reading.value ?? '—'}
                    <Text style={styles.trioUnit}>{reading.unit}</Text>
                  </Text>
                  <Text style={styles.trioLabel}>{reading.label}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.stamp}>
            {model.readAt === null
              ? 'Not read yet'
              : `Read from the sensor · ${formatTime(model.readAt)}`}
          </Text>
        </View>
      </Card>
    </>
  );
}

function Hero({
  value,
  unit,
  label,
}: {
  value: string | null;
  unit: string;
  label: string;
}): React.JSX.Element {
  return (
    <>
      <Text style={styles.heroValue}>
        {value ?? '—'}
        <Text style={styles.heroUnit}>{unit}</Text>
      </Text>
      <Text style={styles.heroLabel}>{label}</Text>
    </>
  );
}

function formatTime(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}.${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  pad: {paddingVertical: spacing.md, paddingHorizontal: spacing.md},
  empty: {fontSize: 12.5, color: colors.muted, textAlign: 'center'},

  heroValue: {
    fontSize: 38,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroUnit: {fontSize: 17, fontWeight: '500', color: colors.muted},
  heroLabel: {
    fontSize: 12.5,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 2,
  },

  trio: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  trioItem: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    paddingVertical: 2,
  },
  trioValue: {fontSize: 21, fontWeight: '600', color: colors.ink},
  trioUnit: {fontSize: 11, fontWeight: '500', color: colors.muted},
  trioLabel: {fontSize: 10.5, color: colors.muted, marginTop: 1},

  stamp: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
});
