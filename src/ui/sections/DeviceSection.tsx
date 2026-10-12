import React from 'react';

import {TAG_LOCATIONS} from '../../domain/device';
import type {AppKeyStatus, DeviceSectionModel} from '../../domain/screen';
import {
  Banner,
  Card,
  HelpfulSectionHeading,
  Row,
} from '../components/primitives';
import {TagLocationHint} from '../components/TagLocationHint';

/**
 * Device — type, band, configuration, revisions, DevEUI, AppKey
 * (PRD B4; REQ-A-04, REQ-A-15).
 *
 * Two things follow the concept screens deliberately:
 *
 * - **Firmware and hardware share one row**, value `1.6 · V3.0`, with the
 *   qualified-revision verdict as the small detail line beneath it. The concept
 *   also turns this row amber with a reason when a revision is not qualified,
 *   which is why an unqualified verdict renders a banner here.
 * - **The AppKey row shows status, never a value** — "Loaded in production"
 *   with a "Verified" pill. That is the only correct way to surface a key the
 *   app must never display, extract, log or export (REQ-A-15), and the model
 *   carries no value for it to leak.
 */

const APP_KEY_ROW: Record<
  AppKeyStatus,
  {sublabel: string; pill: {label: string; tone: 'ok' | 'bad' | 'readonly'}}
> = {
  verified: {
    sublabel: 'Loaded in production',
    pill: {label: 'Verified', tone: 'ok'},
  },
  missing: {
    sublabel: 'Not present on this device',
    pill: {label: 'Missing', tone: 'bad'},
  },
  unknown: {
    sublabel: 'Not checked',
    pill: {label: 'Unknown', tone: 'readonly'},
  },
};

export function DeviceSection({
  model,
}: {
  model: DeviceSectionModel;
}): React.JSX.Element {
  const {identity} = model;
  const appKey = APP_KEY_ROW[model.appKey];

  const revisions =
    identity.firmwareVersion || identity.hardwareVersion
      ? [identity.firmwareVersion, identity.hardwareVersion]
          .filter(Boolean)
          .join(' · ')
      : null;

  const revisionDetail =
    model.revisionVerdict === 'qualified'
      ? 'Qualified revision'
      : model.revisionVerdict === 'not-qualified'
      ? 'Not a qualified revision'
      : 'Revision not checked';

  return (
    <>
      <HelpfulSectionHeading icon="chip" section="device" />
      <Card>
        <Row
          label="Type"
          value={identity.displayName}
          pill={
            identity.bandLabel
              ? {label: `-${identity.bandLabel}`, tone: 'band'}
              : undefined
          }
        />
        <Row
          label="Configuration"
          sublabel={model.configurationLabel}
          value={model.configurationLabel === null ? null : ' '}
          chevron
        />
        <Row
          label="Firmware / hardware"
          value={revisions}
          detail={revisionDetail}
        />
        <Row label="DevEUI" value={identity.devEui} mono />
        <Row label="AppKey" sublabel={appKey.sublabel} pill={appKey.pill} />
      </Card>

      {/*
        Only once the device is known — which is exactly here, below its
        identity. Before a read there is no honest answer to "where do I tap".
      */}
      {identity.typeId !== null && (
        <TagLocationHint location={TAG_LOCATIONS[identity.typeId]} />
      )}
      {model.revisionVerdict === 'not-qualified' && (
        <Banner title="Unqualified revision">
          This firmware or hardware revision is not on the qualified list. Check
          before commissioning.
        </Banner>
      )}
    </>
  );
}
