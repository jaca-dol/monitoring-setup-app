import React, {useState} from 'react';

import type {ExternalSupplyState, PowerModel} from '../../domain/screen';
import {IntervalPicker} from '../components/IntervalPicker';
import {Card, HelpfulSectionHeading, Row} from '../components/primitives';

/**
 * Power — supply state, battery, reporting interval (PRD B4; REQ-A-12).
 *
 * ─── The interval is writable, and the PRD says it should not be ───
 *
 * REQ-A-12 reads "Reporting interval read only … Not offered to write", and
 * writing it is in the PRD's out-of-scope list because the gateway sets it by
 * downlink. dol-sensors decided on 2026-09-29 to offer it anyway. The code
 * follows that decision; the PRD is the thing now out of date.
 *
 * The reason REQ-A-12 gave still holds, though, so it is surfaced rather than
 * dropped: `planWrite` warns that a gateway downlink can change the value back.
 *
 * Row order is not incidental. PRD B3 and the concept's callout table both say
 * the 24 V supply goes *above* the battery on the iDOL53, with the battery
 * labelled as backup, "so a mains-powered unit reading 96 % is not mistaken for
 * healthy when the supply is gone". Battery-powered types omit the supply row
 * and word the battery sub-label the opposite way — the model supplies that
 * wording rather than this component guessing it.
 */

const SUPPLY_LABEL: Record<ExternalSupplyState, string> = {
  present: '24 V present',
  absent: 'Not present',
  unknown: 'Unknown',
};

function formatInterval(seconds: number | null): string | null {
  if (seconds === null) {
    return null;
  }
  return seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`;
}

export function PowerSection({
  model,
  onChangeReportingInterval,
}: {
  model: PowerModel;
  onChangeReportingInterval: (seconds: number) => void;
}): React.JSX.Element {
  const hasSupply = model.externalSupply !== null;
  const [picking, setPicking] = useState(false);

  return (
    <>
      <HelpfulSectionHeading icon="battery" section="power" />
      <Card>
        {hasSupply && (
          <Row
            label="Supply"
            value={SUPPLY_LABEL[model.externalSupply as ExternalSupplyState]}
          />
        )}
        <Row
          label={hasSupply ? 'Backup battery' : 'Battery'}
          sublabel={model.batterySublabel}
          value={
            model.batteryPercent === null ? null : `${model.batteryPercent} %`
          }
        />
        <Row
          label="Reporting interval"
          sublabel={model.reportingIntervalSource}
          value={formatInterval(model.reportingIntervalSeconds)}
          chevron
          onPress={() => setPicking(true)}
        />
      </Card>

      <IntervalPicker
        visible={picking}
        current={model.reportingIntervalSeconds}
        onCancel={() => setPicking(false)}
        onSelect={seconds => {
          setPicking(false);
          // Staged only. Apply is what reaches the device (REQ-A-13).
          onChangeReportingInterval(seconds);
        }}
      />
    </>
  );
}
