import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';

import type {Region} from '../../domain/device';
import type {DeviceScreenModel} from '../../domain/screen';
import {AppBar} from '../components/primitives';
import {ActionsSection} from '../sections/ActionsSection';
import {ControlSection} from '../sections/ControlSection';
import {DeviceSection} from '../sections/DeviceSection';
import {MeasurementSection} from '../sections/MeasurementSection';
import {NetworkSection} from '../sections/NetworkSection';
import {PowerSection} from '../sections/PowerSection';
import {colors, spacing} from '../theme';

/**
 * The one screen every device type shares (PRD B4, REQ-A-14), styled to
 * `docs/SmartAdjust_concept_screens.html`.
 *
 * Section order is fixed — Control, Measurement, Device, Network, Power,
 * Actions — and identical across device types. Adaptation happens *within*
 * sections, by omitting rows that do not apply, never by reordering or removing
 * a section. An installer who has used it on an EM300 finds the same things in
 * the same places on an iDOL53.
 *
 * The app bar names the **dol-sensors article**, not the Milesight part, with
 * the revision and band beneath it — the concept's first callout, against
 * REQ-A-01/A-02.
 *
 * Stage 3 renders this from a static model. Stage 4 supplies a real one.
 */
export interface DeviceScreenHandlers {
  onSetPower: (on: boolean) => void;
  onReboot: () => void;
  onChangeRegion: (region: Region) => void;
  onChangeReportingInterval: (seconds: number) => void;
  onApply: () => void;
  onSaveProfile?: (() => void) | undefined;
  onShareSettings?: (() => void) | undefined;
}

function measurementEmptyMessage(model: DeviceScreenModel): string | undefined {
  if (model.control.powerState === 'off') {
    return 'The sensor is switched off and is not measuring.';
  }
  if (model.capabilities.measurements.length === 0) {
    return 'No measurement channel defined for this device type yet.';
  }
  return undefined;
}

function appBarSubtitle(model: DeviceScreenModel): string {
  const {identity} = model.device;
  const parts = [
    identity.firmwareVersion ? `FW ${identity.firmwareVersion}` : '',
    identity.hardwareVersion ? `HW ${identity.hardwareVersion}` : '',
    identity.bandLabel ? `-${identity.bandLabel}` : '',
  ].filter(Boolean);
  return parts.join(' · ');
}

export function DeviceScreen({
  model,
  handlers,
  applyEnabled = true,
  header,
}: {
  model: DeviceScreenModel;
  handlers: DeviceScreenHandlers;
  applyEnabled?: boolean;
  /** Optional content above the app bar — used by the Stage 3 preview. */
  header?: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.root}>
      {header}
      <AppBar
        title={model.device.identity.displayName}
        subtitle={appBarSubtitle(model)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <ControlSection
          model={model.control}
          onSetPower={handlers.onSetPower}
          onReboot={handlers.onReboot}
        />

        {/*
          A switched-off sensor shows no readings, matching the vendor app.
          The values it last reported are still in the payload, but they
          describe a sensor that is no longer measuring — and a number on
          screen reads as "current" whatever label sits under it. They come
          back as soon as it is switched on and read again.
        */}
        <MeasurementSection
          model={
            model.control.powerState === 'off'
              ? {readings: [], readAt: null}
              : model.measurement
          }
          emptyMessage={measurementEmptyMessage(model)}
        />

        <DeviceSection model={model.device} />

        <NetworkSection
          model={model.network}
          onChangeRegion={handlers.onChangeRegion}
        />

        <PowerSection
          model={model.power}
          onChangeReportingInterval={handlers.onChangeReportingInterval}
        />

        <ActionsSection
          onApply={handlers.onApply}
          applyEnabled={applyEnabled}
          onSaveProfile={handlers.onSaveProfile}
          onShareSettings={handlers.onShareSettings}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.page},
  content: {
    paddingHorizontal: 12,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});
