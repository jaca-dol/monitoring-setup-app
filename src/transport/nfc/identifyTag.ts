import NfcManager, {NfcEvents} from 'react-native-nfc-manager';

import {describeError} from './capability';
import {resetNfcSession} from './session';

/**
 * Vendor-independent tag identification — the Android equivalent of a generic
 * "NFC tools" app.
 *
 * This deliberately does NOT go through toolbox-sdk. The SDK's read path calls
 * `requestTechnology(NfcTech.NfcA)`, which blocks indefinitely until a tag
 * exposing that specific technology appears; if the tag is something else, the
 * promise simply never settles and there is nothing to see. This probe instead
 * registers for *any* tag and reports what Android actually found, so "the SDK
 * cannot talk to this tag" can be told apart from "the phone never saw a tag".
 */

export interface TagInfo {
  /** UID as reported by Android, uppercase hex, no separators. */
  id: string;
  /** Formatted the way most NFC tools show it, e.g. `08:07:52:A2`. */
  idFormatted: string;
  /** Android tech list, e.g. `android.nfc.tech.NfcA`. */
  techTypes: string[];
  /** How the SDK would classify this chip from its UID prefix. */
  sdkChipType: 'NT3H2111' | 'FM17660K' | 'unknown';
  /** Whether the SDK's Android read path could ever match this tag. */
  exposesNfcA: boolean;
}

/**
 * Mirrors `NfcProxy.getTagType()` in toolbox-sdk: NXP (`04`) is the chip
 * Milesight normally ships, `1D` is the Fudan part used on a few models, and
 * anything else the SDK treats as unknown.
 */
function classifyChip(id: string): TagInfo['sdkChipType'] {
  const upper = id.toUpperCase();
  if (upper.startsWith('04')) {
    return 'NT3H2111';
  }
  if (upper.startsWith('1D')) {
    return 'FM17660K';
  }
  return 'unknown';
}

function normaliseId(raw: unknown): string {
  if (typeof raw === 'string') {
    return raw.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  }
  if (Array.isArray(raw)) {
    return raw
      .map(b => (((Number(b) % 256) + 256) % 256).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }
  return '';
}

function formatId(id: string): string {
  return (id.match(/.{1,2}/g) ?? []).join(':');
}

async function cleanup(): Promise<void> {
  try {
    NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
  } catch {
    // listener was never attached
  }
  try {
    await NfcManager.unregisterTagEvent();
  } catch {
    // nothing registered
  }
}

/**
 * Waits for any NFC tag and describes it. Rejects after `timeoutMs` rather
 * than hanging, so a failed scan is always visible.
 */
export async function identifyTag(timeoutMs = 15000): Promise<TagInfo> {
  await NfcManager.start();
  await resetNfcSession();

  return new Promise<TagInfo>((resolve, reject) => {
    let settled = false;

    const finish = async (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      await cleanup();
      fn();
    };

    const timer = setTimeout(() => {
      void finish(() =>
        reject(
          new Error(
            `No tag detected in ${Math.round(
              timeoutMs / 1000,
            )}s. Move the phone slowly across the sensor — the antenna is usually in the upper third of the back.`,
          ),
        ),
      );
    }, timeoutMs);

    NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag: unknown) => {
      const raw = (tag ?? {}) as {id?: unknown; techTypes?: unknown};
      const id = normaliseId(raw.id);
      const techTypes = Array.isArray(raw.techTypes)
        ? raw.techTypes.map(String)
        : [];

      void finish(() =>
        resolve({
          id,
          idFormatted: formatId(id),
          techTypes,
          sdkChipType: classifyChip(id),
          exposesNfcA: techTypes.some(t => t.endsWith('NfcA')),
        }),
      );
    });

    NfcManager.registerTagEvent().catch((error: unknown) => {
      void finish(() => reject(new Error(describeError(error))));
    });
  });
}

/** Aborts an in-flight identify scan. */
export async function cancelIdentify(): Promise<void> {
  await cleanup();
}
