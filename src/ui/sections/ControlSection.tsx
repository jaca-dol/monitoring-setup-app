import React from 'react';

import type {ControlModel} from '../../domain/screen';
import {
  Card,
  HelpfulSectionHeading,
  Row,
  Toggle,
} from '../components/primitives';

/**
 * Control — first section, because an off device has nothing to read
 * (PRD B4, REQ-A-05). Power is a state, reboot is an action.
 *
 * Follows the concept screens: a "Device / On" row with a toggle, then a
 * "Restart / Keeps the configuration" row with a chevron. That sub-label is
 * load-bearing — the SDK's separate factory-reset command does *not* keep the
 * configuration, and also resets the device password.
 */
export function ControlSection({
  model,
  onSetPower,
  onReboot,
}: {
  model: ControlModel;
  onSetPower: (on: boolean) => void;
  onReboot: () => void;
}): React.JSX.Element {
  const known = model.powerState !== 'unknown';

  return (
    <>
      <HelpfulSectionHeading icon="power" section="control" />
      <Card>
        <Row
          label="Device"
          sublabel={
            known ? (model.powerState === 'on' ? 'On' : 'Off') : 'Unknown'
          }
          control={
            <Toggle
              value={model.powerState === 'on'}
              onChange={onSetPower}
              disabled={!known}
            />
          }
        />
        <Row
          label="Restart"
          sublabel="Keeps the configuration"
          value=" "
          chevron
          onPress={onReboot}
        />
      </Card>
    </>
  );
}
