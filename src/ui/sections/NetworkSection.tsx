import React, {useState} from 'react';

import {RSSI_LIMIT_LABEL} from '../../config/signal';
import type {Region} from '../../domain/device';
import type {NetworkModel, SignalVerdict} from '../../domain/screen';
import {
  Card,
  HelpfulSectionHeading,
  Row,
  type PillTone,
} from '../components/primitives';
import {RegionPicker} from '../components/RegionPicker';

/**
 * Network — region, connection, signal (PRD B4; REQ-A-08, A-10, A-11).
 *
 * Follows the concept screens' shape: three rows, each with the reading as a
 * sub-label and the verdict or value on the right. Two details from the concept
 * are deliberate and worth keeping:
 *
 * - The region row **names the alternatives** in its sub-label ("Change to
 *   IN865 or RU864") rather than hiding them behind the control.
 * - When there is nothing to choose it shows **no chevron at all**, so the row
 *   reports and does not invite a tap (REQ-A-08).
 *
 * The channel plan is written with the region and never shown (REQ-A-09), so it
 * does not appear here.
 *
 * Two places where the concept and the PRD disagree, resolved in the PRD's
 * favour per the concept's own footer:
 *
 * - The concept labels the middle row "Join status / Joined". REQ-A-10 says to
 *   show whether the device reaches the gateway, *not* LoRaWAN join state.
 * - The concept uses a "Marginal" pill at −104 dBm. PRD B5 has no such verdict:
 *   below −100 dBm is "Unusable".
 */

const VERDICT_LABEL: Record<SignalVerdict, string> = {
  good: 'Good',
  weak: 'Weak',
  unusable: 'Unusable',
  disconnected: 'Disconnected',
};

const VERDICT_TONE: Record<SignalVerdict, PillTone> = {
  good: 'ok',
  weak: 'band',
  unusable: 'bad',
  disconnected: 'bad',
};

export function NetworkSection({
  model,
  onChangeRegion,
}: {
  model: NetworkModel;
  onChangeRegion: (region: Region) => void;
}): React.JSX.Element {
  const alternatives = model.selectableRegions.filter(r => r !== model.region);
  const [picking, setPicking] = useState(false);

  return (
    <>
      <HelpfulSectionHeading icon="signal" section="network" />
      <Card>
        {model.regionIsFixed ? (
          <Row
            label="Region"
            sublabel="Fixed on this hardware"
            value={model.region ?? 'unknown'}
          />
        ) : (
          <Row
            label="Region"
            sublabel={
              alternatives.length > 0
                ? `Change to ${formatList(alternatives)}`
                : null
            }
            value={model.region ?? 'not set'}
            chevron
            onPress={() => setPicking(true)}
          />
        )}

        <Row
          label="Connection"
          value={
            model.connection === 'connected' ? 'Connected' : 'Disconnected'
          }
          detail={model.connectionDetail}
        />

        <Row
          label="Signal"
          sublabel={formatSignal(model)}
          pill={{
            label: VERDICT_LABEL[model.signal.verdict],
            tone: VERDICT_TONE[model.signal.verdict],
          }}
        />
      </Card>

      <RegionPicker
        visible={picking}
        regions={model.selectableRegions}
        current={model.region}
        onCancel={() => setPicking(false)}
        onSelect={region => {
          setPicking(false);
          // Staged only. Apply is what reaches the device (REQ-A-13).
          onChangeRegion(region);
        }}
      />
    </>
  );
}

function formatList(items: string[]): string {
  if (items.length <= 1) {
    return items.join('');
  }
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

/**
 * A device that has never joined reports `rssi: 0`, which is not a reading. The
 * model carries null in that case, so this says so rather than printing a
 * number that would look like an excellent signal.
 */
function formatSignal(model: NetworkModel): string {
  const {rssi, snr} = model.signal;
  if (rssi === null && snr === null) {
    return `No signal reading · ${RSSI_LIMIT_LABEL}`;
  }
  const parts: string[] = [];
  if (rssi !== null) {
    parts.push(`${rssi} dBm`);
  }
  if (snr !== null) {
    parts.push(`SNR ${snr} dB`);
  }
  return `${parts.join(' · ')} · ${RSSI_LIMIT_LABEL}`;
}
