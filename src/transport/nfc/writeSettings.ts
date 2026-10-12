import {configureSdkSecurity} from '../../security/configureSdkSecurity';

import {describeError} from './capability';
import {resetNfcSession} from './session';
import {stripKeyMaterial} from './stripKeys';
import {applyNfcTiming, type TimingProfile} from './tuning';

/**
 * Applies settings to a device (roadmap task 13; REQ-A-13).
 *
 * ─── Why this is atomic ───
 *
 * `NfcController.writeFlash()` does not write field by field. It obtains the
 * **whole flash image**, applies the changed fields onto it natively
 * (`DeviceUtils.setFlashInfo`), and writes the entire image back in one
 * command. There is no sequence of per-field writes that could stop half way,
 * which is what REQ-A-13 is guarding against.
 *
 * It also re-reads the image itself when the SDK store holds none — which is
 * our case, because the read path uses `readFlash()` and never populates that
 * store. So every apply is built from a **freshly-read full state**, exactly as
 * `docs/milesight-protocol-reference.md` prescribes, and never from a stale or
 * partial local model that could clobber fields the app did not intend to
 * touch.
 *
 * That is worth stating plainly: the atomicity comes from the vendor's design,
 * not from anything this file adds. What this file adds is refusing to start
 * when the inputs are wrong.
 */

export interface ApplyResult {
  /** Field names written. Values are not returned. */
  written: string[];
  elapsedMs: number;
  /** The payload read back afterwards, key material already stripped. */
  verified: Record<string, unknown>;
}

interface NfcControllerWrite {
  write?: (
    settingJSON: string,
    newDeviceSettingInfo: unknown,
  ) => Promise<unknown>;
  readFlash?: () => Promise<unknown>;
  getPasswordId?: () => string;
}

function loadController(): NfcControllerWrite {
  const sdk = require('toolbox-sdk') as {NFC?: NfcControllerWrite};
  const controller = sdk.NFC;
  if (controller === undefined || controller === null) {
    throw new Error('toolbox-sdk loaded but exported no NFC controller.');
  }
  return controller;
}

/**
 * Seeds the SDK store with the serial number, and nothing else.
 *
 * After a successful write, `writeFlash` reads `getDeviceInfo(store).sn` to
 * decide whether to remember the password it used. With our store empty that
 * lookup yields `undefined`, and `DevicePasswordManager.normalizeSn()` calls
 * `.toUpperCase()` on it — throwing *after* the device has already been
 * written, so the app would report a failure for a write that succeeded.
 *
 * Seeding just the SN avoids that without putting key material in the SDK
 * store, which is the property `docs/stage5-security-review.md` §4 protects.
 */
function seedSerialNumber(sn: string): void {
  if (sn === '') {
    return;
  }
  try {
    const store = require('toolbox-sdk/lib/module/utils/store/store.js') as {
      default?: {dispatch: (action: unknown) => void};
    };
    const actions =
      require('toolbox-sdk/lib/module/utils/store/actions.js') as {
        setDeviceInfo?: (info: Record<string, unknown>) => unknown;
      };
    if (
      store.default === undefined ||
      typeof actions.setDeviceInfo !== 'function'
    ) {
      return;
    }
    store.default.dispatch(actions.setDeviceInfo({sn}));
  } catch (error) {
    // Not fatal on its own — the post-write branch may not be taken at all.
    console.warn('[write] could not seed serial number', error);
  }
}

export interface ApplySettingsInput {
  /** Field/value pairs from `planWrite`. Must be non-empty. */
  fields: Record<string, unknown>;
  /** Serial number of the device being written, from the last read. */
  serialNumber: string;
  timing?: TimingProfile;
  timeoutMs?: number;
}

/**
 * Writes the given fields, then reads the device back to confirm.
 *
 * The read-back is not decoration: a write that reports success but did not
 * take is the failure mode that matters here, and the only way to know is to
 * ask the device.
 */
export async function applySettings({
  fields,
  serialNumber,
  timing = 'slow',
  timeoutMs = 40000,
}: ApplySettingsInput): Promise<ApplyResult> {
  const names = Object.keys(fields);
  if (names.length === 0) {
    throw new Error('Nothing to apply.');
  }

  const controller = loadController();
  if (typeof controller.write !== 'function') {
    throw new Error('toolbox-sdk does not expose write().');
  }

  // The write is authenticated, so the password store must be configured.
  const security = await configureSdkSecurity();
  if (security.state !== 'ready') {
    throw new Error(
      `Secure storage is unavailable, so settings cannot be written: ${security.message}`,
    );
  }

  applyNfcTiming(timing);
  await resetNfcSession();
  seedSerialNumber(serialNumber);

  const startedAt = Date.now();
  const settingJSON = JSON.stringify(fields);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `The write did not complete in ${Math.round(timeoutMs / 1000)}s. ` +
            'The device may or may not have been changed — read it again before retrying.',
        ),
      );
    }, timeoutMs);
  });

  // `newDeviceSettingInfo` carries no key material and no password: we are not
  // changing the password, and the SDK resolves the one it needs itself.
  const pending = controller.write(settingJSON, {sn: serialNumber});
  pending.catch(() => undefined);

  try {
    await Promise.race([pending, timeout]);
  } catch (error) {
    throw new Error(describeError(error));
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }

  // Confirm against the device rather than trusting the write's own report.
  await resetNfcSession();
  const readBack = (await controller.readFlash?.()) as
    | {deviceInfo?: Record<string, unknown>}
    | undefined;

  const {payload} = stripKeyMaterial(readBack?.deviceInfo ?? {});

  return {
    written: names,
    elapsedMs: Date.now() - startedAt,
    verified: payload,
  };
}

/**
 * Checks the read-back actually carries the values that were written.
 *
 * Pure enough to test: takes the fields asked for and the payload that came
 * back, and returns the ones that did not stick.
 */
export function unappliedFields(
  fields: Record<string, unknown>,
  verified: Record<string, unknown>,
): string[] {
  return Object.keys(fields).filter(name => verified[name] !== fields[name]);
}
