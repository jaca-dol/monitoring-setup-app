import {configureSdkSecurity} from '../../security/configureSdkSecurity';

import {describeError} from './capability';
import {resetNfcSession} from './session';
import {applyNfcTiming, type TimingProfile} from './tuning';

/**
 * Device control commands over NFC (REQ-A-05, roadmap task 7).
 *
 * Power is a state, reboot is an action, and both must be reachable before any
 * reading is taken — an off device has nothing to read.
 *
 * ─── The one trap in this file ───
 *
 * The SDK exposes **two** commands that sound alike:
 *
 * - `NFC.restart()` — 设备重启, reboot. Keeps the configuration. This is
 *   REQ-A-05's reboot.
 * - `NFC.reset()` — 设备重置, factory reset. Wipes settings **and rewrites the
 *   stored device password to `123456`**.
 *
 * Milesight's own README documents `NFC.reset()` under the heading "Restart",
 * which is wrong. Wiring a reboot button to it would factory-reset commissioned
 * devices in the field. `reset()` is deliberately not wrapped here at all, so
 * it cannot be reached by accident.
 *
 * ─── Unresolved: where the password comes from ───
 *
 * Every command below is authenticated. The SDK resolves the password through
 * `DevicePasswordManager.getPasswordById(tagId)`, which falls back to the
 * hardcoded default `123456` when nothing is stored, and nothing in this app
 * injects the supplier's production password yet (REQ-A-03). These are the
 * first commands that will expose that gap on real hardware; a
 * `wrongPassword` failure here is the expected symptom, not a transport bug.
 */

export type DeviceCommand = 'powerOn' | 'powerOff' | 'restart';

interface NfcController {
  powerOn?: () => Promise<unknown>;
  powerOff?: () => Promise<unknown>;
  restart?: () => Promise<unknown>;
}

function loadController(): NfcController {
  const sdk = require('toolbox-sdk') as {NFC?: NfcController};
  const controller = sdk.NFC;
  if (controller === undefined || controller === null) {
    throw new Error('toolbox-sdk loaded but exported no NFC controller.');
  }
  return controller;
}

const COMMAND_LABEL: Record<DeviceCommand, string> = {
  powerOn: 'Power on',
  powerOff: 'Power off',
  restart: 'Restart',
};

/**
 * Sends one command and waits for it.
 *
 * Times out rather than hanging: the SDK's `requestTechnology` has no timeout
 * of its own, so without this a command against a tag that never appears would
 * spin indefinitely with nothing on screen.
 */
export async function sendDeviceCommand(
  command: DeviceCommand,
  timing: TimingProfile = 'slow',
  timeoutMs = 20000,
): Promise<void> {
  const controller = loadController();
  const run = controller[command];
  if (typeof run !== 'function') {
    throw new Error(`toolbox-sdk does not expose ${command}().`);
  }

  // Every command below is authenticated, so the SDK will read the device
  // password store. The store's encryption key is per-install and comes from
  // the OS keystore; without it the patched DevicePasswordManager throws rather
  // than falling back to the vendor's shared literal. Fail here with something
  // readable instead.
  const security = await configureSdkSecurity();
  if (security.state !== 'ready') {
    throw new Error(
      `Secure storage is unavailable, so device commands are disabled: ${security.message}`,
    );
  }

  applyNfcTiming(timing);
  await resetNfcSession();

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      void resetNfcSession();
      reject(
        new Error(
          `${COMMAND_LABEL[command]} did not complete in ${Math.round(
            timeoutMs / 1000,
          )}s. Hold the phone against the sensor without moving it.`,
        ),
      );
    }, timeoutMs);
  });

  const pending = run.call(controller);
  // The losing side of the race still settles; swallow it so a late rejection
  // does not surface as an unhandled promise rejection.
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
}
