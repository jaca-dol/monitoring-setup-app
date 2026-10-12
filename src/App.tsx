import React, {useState} from 'react';
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {DeviceReadScreen} from './ui/screens/DeviceReadScreen';
import {DeviceScreenPreview} from './ui/screens/DeviceScreenPreview';
import {NfcProbeScreen} from './ui/screens/NfcProbeScreen';
import {colors, spacing} from './ui/theme';

/**
 * Two screens while the prototype is mid-build:
 *
 * - **Screen** — the Stage 3 shell on static data, styled to the concept.
 * - **Probe** — the Stage 1/2 NFC diagnostics, still needed against hardware.
 *
 * Scaffolding. Stage 4 merges them: the real read fills the shell and the probe
 * becomes a debug affordance rather than a peer screen.
 */
type Tab = 'read' | 'preview' | 'probe';

export default function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('read');

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={styles.tabs}>
        <TabButton
          label="Read"
          active={tab === 'read'}
          onPress={() => setTab('read')}
        />
        <TabButton
          label="Preview"
          active={tab === 'preview'}
          onPress={() => setTab('preview')}
        />
        <TabButton
          label="Probe"
          active={tab === 'probe'}
          onPress={() => setTab('probe')}
        />
      </View>
      {tab === 'read' && <DeviceReadScreen />}
      {tab === 'preview' && <DeviceScreenPreview />}
      {tab === 'probe' && <NfcProbeScreen />}
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.tab}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
      {active && <View style={styles.tabUnderline} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.page},
  tabs: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  tab: {paddingVertical: spacing.sm + 2},
  tabLabel: {fontSize: 13, fontWeight: '500', color: colors.muted},
  tabLabelActive: {color: colors.navy, fontWeight: '700'},
  tabUnderline: {
    height: 2,
    backgroundColor: colors.navy,
    borderRadius: 2,
    marginTop: 4,
  },
});
