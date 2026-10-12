import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {colors} from '../theme';

import {SheetButton, SheetShell, sheetStyles} from './SheetShell';

/**
 * A single-choice bottom sheet.
 *
 * Staged, never written: selecting here changes what Apply *would* write, and
 * nothing reaches the device until then (REQ-A-13).
 *
 * The current value is always listed and ticked, never hidden among the
 * alternatives — an installer needs to see where the device is now as much as
 * where it could go.
 */
export interface Choice<T> {
  value: T;
  label: string;
  /** Optional second line, e.g. what a value costs. */
  detail?: string | undefined;
}

export function ChoiceSheet<T extends string | number>({
  visible,
  title,
  body,
  options,
  current,
  onSelect,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  options: readonly Choice<T>[];
  current: T | null;
  onSelect: (value: T) => void;
  onCancel: () => void;
}): React.JSX.Element {
  return (
    <SheetShell visible={visible} title={title} body={body} onClose={onCancel}>
      <ScrollView style={sheetStyles.list} bounces={false}>
        {options.map(option => {
          const isCurrent = option.value === current;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{selected: isCurrent}}
              onPress={() => onSelect(option.value)}
              style={styles.option}>
              <View style={styles.optionText}>
                <Text
                  style={[styles.optionLabel, isCurrent && styles.optionOn]}>
                  {option.label}
                </Text>
                {option.detail !== undefined && option.detail !== '' && (
                  <Text style={styles.optionDetail}>{option.detail}</Text>
                )}
              </View>
              {isCurrent && <Text style={styles.tick}>✓</Text>}
            </Pressable>
          );
        })}
      </ScrollView>

      <SheetButton label="Cancel" onPress={onCancel} />
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  optionText: {flex: 1},
  optionLabel: {fontSize: 15, color: colors.ink},
  optionOn: {fontWeight: '600', color: colors.navy},
  optionDetail: {fontSize: 12, color: colors.muted, marginTop: 1},
  tick: {fontSize: 15, fontWeight: '600', color: colors.navy},
});
