import React from 'react';
import {StyleSheet, View} from 'react-native';

import {ApplyBar, SecondaryButton} from '../components/primitives';
import {spacing} from '../theme';

/**
 * Actions — the two secondary buttons, then the apply bar (PRD B4).
 *
 * The concept has no "Actions" heading: the buttons sit directly on the page
 * below the Power card, and the green apply bar is the last thing on the
 * screen. That is followed here.
 *
 * Save and share are REQ-A-17, whose priority the PRD marks TBD; they are laid
 * out but disabled so an unbuilt feature does not look like a working one. The
 * write path itself is Stage 6.
 */
export function ActionsSection({
  onApply,
  applyEnabled,
  onSaveProfile,
  onShareSettings,
}: {
  onApply: () => void;
  applyEnabled: boolean;
  onSaveProfile?: (() => void) | undefined;
  onShareSettings?: (() => void) | undefined;
}): React.JSX.Element {
  const noop = () => {};

  return (
    <View accessibilityLabel="section:Actions">
      <View style={styles.row}>
        <SecondaryButton
          label="↧  Save to profile"
          onPress={onSaveProfile ?? noop}
          disabled={onSaveProfile === undefined}
        />
        <SecondaryButton
          label="↪  Share settings"
          onPress={onShareSettings ?? noop}
          disabled={onShareSettings === undefined}
        />
      </View>
      <ApplyBar
        label="))  Apply sensor settings"
        onPress={onApply}
        disabled={!applyEnabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: spacing.sm + 2, marginTop: spacing.md},
});
