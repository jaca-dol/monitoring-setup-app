import 'react-native-get-random-values';

import * as Keychain from 'react-native-keychain';

/**
 * The encryption key for toolbox-sdk's device-password store.
 *
 * ─── Why this exists ───
 *
 * The SDK shipped a hardcoded key:
 *
 *   new Storage({id: 'dp', encryptionKey: '7fh4yC5XqG9SkACt2vcvY0333KbbP2lvMK7iDDCGVTE'})
 *
 * The same literal is in every copy of the SDK, in plaintext in `node_modules`,
 * and it was verified present in our own production JS bundle. That is
 * obfuscation, not encryption: anyone with the APK has the key, so one key
 * break reads the stored device passwords of *every* installation, not just the
 * phone in hand.
 *
 * This replaces it with a key that is:
 *
 * - **random**, from the platform CSPRNG;
 * - **per install**, so a break reads one phone;
 * - **held by the OS keystore** (Android Keystore / iOS Keychain), so file-level
 *   access to the app sandbox is not enough — an attacker needs to execute as
 *   the app on that specific device.
 *
 * Paired with `android:allowBackup="false"`, which already closes the
 * backup-extraction route.
 *
 * ─── Deliberate choices ───
 *
 * No biometric prompt. The key guards data the app needs on every NFC command;
 * prompting an installer for a fingerprint mid-commissioning would be
 * user-hostile, and the threat model here is a stolen or seized handset, not a
 * malicious user of an unlocked one.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` so the key never syncs anywhere and is
 * unavailable while the device is locked.
 */

/** Keychain service name. Changing it orphans the stored key. */
const SERVICE = 'dol-sensors.monitoring-setup.password-store';

/** 32 bytes, hex-encoded — comfortably above the 16-char minimum. */
const KEY_BYTES = 32;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateKey(): string {
  const bytes = new Uint8Array(KEY_BYTES);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/**
 * Returns this installation's key, creating and storing one on first run.
 *
 * Throws rather than falling back to a weaker key: a silent downgrade to a
 * shared or predictable key is exactly the failure this replaces, and it would
 * be invisible.
 */
export async function getOrCreatePasswordStoreKey(): Promise<string> {
  const existing = await Keychain.getGenericPassword({service: SERVICE});
  if (existing !== false && existing.password.length >= 16) {
    return existing.password;
  }

  const key = generateKey();
  await Keychain.setGenericPassword('password-store', key, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

/**
 * Discards the stored key.
 *
 * Any device passwords encrypted under it become unreadable, which is the
 * point: this is the "forget everything" control, not a rotation helper.
 */
export async function clearPasswordStoreKey(): Promise<void> {
  await Keychain.resetGenericPassword({service: SERVICE});
}
