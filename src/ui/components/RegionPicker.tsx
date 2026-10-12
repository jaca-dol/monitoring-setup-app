import React from 'react';

import type {Region} from '../../domain/device';

import {ChoiceSheet} from './ChoiceSheet';

/**
 * Choosing the LoRaWAN region to write (REQ-A-08).
 *
 * Replaces an earlier shortcut where tapping the region row jumped straight to
 * the first alternative. With one alternative that was merely opaque; with two
 * — IN865 and RU864 both offered on "-868M" hardware — it silently picked one,
 * which is not a choice.
 *
 * The channel plan is deliberately absent: REQ-A-09 writes it alongside the
 * region and it is never displayed or separately settable.
 */
export function RegionPicker({
  visible,
  regions,
  current,
  onSelect,
  onCancel,
}: {
  visible: boolean;
  regions: readonly Region[];
  /** The region on the device, or staged. Marked, never hidden. */
  current: Region | null;
  onSelect: (region: Region) => void;
  onCancel: () => void;
}): React.JSX.Element {
  return (
    <ChoiceSheet
      visible={visible}
      title="Region"
      body="The sensor and the gateway must agree. Choosing here does not change the sensor — it is written when you apply the settings."
      options={regions.map(region => ({value: region, label: region}))}
      current={current}
      onSelect={onSelect}
      onCancel={onCancel}
    />
  );
}
