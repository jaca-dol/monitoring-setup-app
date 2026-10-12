import NfcManager from 'react-native-nfc-manager';

/**
 * NFC hardware/state capability check (REQ-A-18, roadmap task 16).
 *
 * `react-native-nfc-manager`'s Android manifest declares
 * `uses-feature android.hardware.nfc` with `required="false"`, so the app
 * installs on handsets with no NFC radio at all. That is why this check has to
 * exist and has to produce a message a field installer can act on.
 *
 * Transport layer: knows about the radio, knows nothing about payloads.
 */

export type NfcAvailability =
  | {status: 'ready'}
  | {status: 'unsupported'; message: string}
  | {status: 'disabled'; message: string}
  | {status: 'error'; message: string};

/**
 * Checks for an NFC radio, then whether it is switched on, then starts the
 * manager. Safe to call more than once.
 */
export async function checkNfcAvailability(): Promise<NfcAvailability> {
  try {
    const supported = await NfcManager.isSupported();
    if (!supported) {
      return {
        status: 'unsupported',
        message:
          'This phone has no NFC reader. Sensor setup needs NFC — use a handset that supports it.',
      };
    }

    await NfcManager.start();

    const enabled = await NfcManager.isEnabled();
    if (!enabled) {
      return {
        status: 'disabled',
        message:
          'NFC is switched off. Turn it on in Android settings, then try again.',
      };
    }

    return {status: 'ready'};
  } catch (error) {
    return {status: 'error', message: describeError(error)};
  }
}

/** Opens the system NFC settings screen. Android only; a no-op elsewhere. */
export async function openNfcSettings(): Promise<void> {
  await NfcManager.goToNfcSetting();
}

export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
