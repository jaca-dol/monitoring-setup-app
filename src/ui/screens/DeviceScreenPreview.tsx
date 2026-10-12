import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import type {DeviceTypeId, Region} from '../../domain/device';
import {DISPLAY_NAMES} from '../../domain/device';
import {PREVIEW_MODELS, PREVIEW_ORDER} from '../preview/previewModels';
import {colors, spacing} from '../theme';

import {DeviceScreen} from './DeviceScreen';

/**
 * Stage 3 preview: the shared screen driven by static models, with a switcher
 * so all three device types can be compared against the concept screens.
 *
 * **Scaffolding — delete when Stage 4 wires the real read in.**
 */
export function DeviceScreenPreview(): React.JSX.Element {
  const [typeId, setTypeId] = useState<DeviceTypeId>('idol53');
  const [region, setRegion] = useState<Region>('EU868');
  const [powerOn, setPowerOn] = useState(true);

  const [intervalSeconds, setIntervalSeconds] = useState<number | null>(null);

  const base = PREVIEW_MODELS[typeId];
  const model = {
    ...base,
    control: {powerState: powerOn ? ('on' as const) : ('off' as const)},
    network: {...base.network, region},
    power: {
      ...base.power,
      ...(intervalSeconds === null
        ? {}
        : {reportingIntervalSeconds: intervalSeconds}),
    },
  };

  const onChangeRegion = useCallback((next: Region) => setRegion(next), []);
  const onChangeReportingInterval = useCallback(
    (seconds: number) => setIntervalSeconds(seconds),
    [],
  );

  const header = (
    <View style={styles.switcher}>
      {PREVIEW_ORDER.map(id => (
        <Pressable
          key={id}
          accessibilityRole="button"
          onPress={() => setTypeId(id)}
          style={[styles.chip, id === typeId && styles.chipActive]}>
          <Text
            style={[styles.chipLabel, id === typeId && styles.chipLabelActive]}>
            {DISPLAY_NAMES[id]}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <DeviceScreen
      model={model}
      header={header}
      handlers={{
        onSetPower: setPowerOn,
        onReboot: () => {},
        onChangeRegion,
        onChangeReportingInterval,
        onApply: () => {},
      }}
    />
  );
}

const styles = StyleSheet.create({
  switcher: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    backgroundColor: colors.page,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  chipActive: {backgroundColor: colors.navy, borderColor: colors.navy},
  chipLabel: {fontSize: 12, fontWeight: '500', color: colors.navy},
  chipLabelActive: {color: '#ffffff'},
});
