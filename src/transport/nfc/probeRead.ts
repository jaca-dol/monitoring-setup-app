import NfcManager from 'react-native-nfc-manager';

import {describeError} from './capability';
import {resetNfcSession} from './session';
import {stripKeyMaterial} from './stripKeys';
import {applyNfcTiming, type TimingProfile} from './tuning';

/**
 * Stage 1 probe read — the smallest thing that proves the SDK can talk to real
 * hardware at the byte level. Nothing is decoded here beyond what the SDK
 * hands back, and nothing is built on top of it. See docs/roadmap.md Stage 1.
 *
 * `NfcController.readFlash()` is used rather than `useCommService().read('nfc')`
 * because it returns `rawData` alongside the decoded `deviceInfo`, and raw
 * bytes are what this stage exists to confirm. It is also a plain object, not a
 * hook, so it can be called from anywhere.
 */

export interface ProbeReadResult {
  /** Raw flash bytes, device status page already stripped by the SDK. */
  rawByteCount: number;
  /** Wall-clock duration of the read, for judging how long a tap must be held. */
  elapsedMs: number;
  rawHexPreview: string;
  /** Field names the SDK decoded. Values are deliberately not returned here. */
  decodedFieldNames: string[];
  /** Whether the payload carried a LoRaWAN AppKey — the REQ-A-15 question. */
  containsApplicationKey: boolean;
  /** Key-material fields that were present and have been stripped. */
  removedSecrets: string[];
  /**
   * Decoded payload with all LoRaWAN key material removed (see `stripKeys`).
   * This is the only form of the payload that leaves the transport layer.
   */
  deviceInfo: Record<string, unknown>;
}

/**
 * The SDK is loaded lazily and defensively.
 *
 * Importing `toolbox-sdk` evaluates its BLE and WiFi modules as a side effect
 * of its root export (see docs/sdk-pre-stage1-review.md §1), and those native
 * modules are deliberately not linked. Static analysis says that is survivable;
 * this is the check that proves it. Loading here rather than at module scope
 * means a failure shows up as a readable message on the probe screen instead of
 * a white screen at boot.
 */
function loadNfcController(): {readFlash: () => Promise<unknown>} {
  const sdk = require('toolbox-sdk');
  const controller = sdk.NFC;
  if (!controller || typeof controller.readFlash !== 'function') {
    throw new Error(
      'toolbox-sdk loaded but did not export an NFC controller with readFlash().',
    );
  }
  return controller;
}

function toHexPreview(bytes: readonly number[], limit = 64): string {
  return bytes
    .slice(0, limit)
    .map(b => (((b % 256) + 256) % 256).toString(16).padStart(2, '0'))
    .join(' ');
}

/**
 * Aborts an in-flight SDK read.
 *
 * The SDK's `startDetection()` calls `requestTechnology()` with no timeout, so
 * without this a read that never finds a matching tag hangs forever with no
 * error and no way back. Cancelling the technology request is what unblocks it.
 */
export async function cancelProbeRead(): Promise<void> {
  try {
    await NfcManager.cancelTechnologyRequest();
  } catch {
    // nothing in flight
  }
}

/** `TagTechnologyRequest.connect()` failed — a dead or contended tag handle. */
function isConnectFailure(error: unknown): boolean {
  const text =
    typeof error === 'string'
      ? error
      : error instanceof Error
      ? error.message
      : '';
  return text.toLowerCase().includes('fail to connect');
}

async function readOnce(
  controller: {readFlash: () => Promise<unknown>},
  timeoutMs: number,
): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      void cancelProbeRead();
      reject(
        new Error(
          `The SDK read did not complete in ${Math.round(
            timeoutMs / 1000,
          )}s. It waits for a tag exposing NfcA specifically — run "Identify tag" to see what this tag actually exposes.`,
        ),
      );
    }, timeoutMs);
  });

  // The losing side of the race still settles. When the timeout wins, the
  // SDK's own rejection would otherwise surface later as an unhandled
  // rejection ("UnhandledError undefined"), so it is swallowed deliberately.
  const read = controller.readFlash();
  read.catch(() => undefined);

  return Promise.race([read, timeout]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

export async function probeRead(
  timing: TimingProfile = 'slow',
  timeoutMs = 20000,
): Promise<ProbeReadResult> {
  const controller = loadNfcController();
  const startedAt = Date.now();

  applyNfcTiming(timing);

  // Start from a known-idle stack. Without this, a read started straight after
  // the identify probe inherits its tag-event registration and fails at
  // connect() rather than anywhere informative.
  await resetNfcSession();

  let raw: unknown;
  try {
    raw = await readOnce(controller, timeoutMs);
  } catch (error) {
    if (!isConnectFailure(error)) {
      throw error;
    }
    // A dead tag handle is recoverable: reset and let the tag be rediscovered.
    await resetNfcSession();
    try {
      raw = await readOnce(controller, timeoutMs);
    } catch (retryError) {
      if (!isConnectFailure(retryError)) {
        throw retryError;
      }
      throw new Error(
        'Could not connect to the tag (two attempts). Lift the phone fully away from the sensor, wait a second, then press SDK read and tap it again — Android invalidates the tag handle if the tag never leaves the field.',
      );
    }
  }

  const result = raw as
    | {deviceInfo?: Record<string, unknown>; rawData?: number[]}
    | undefined;

  if (!result) {
    throw new Error(
      'readFlash() resolved without a result — tag may have moved out of range.',
    );
  }

  const rawData = Array.isArray(result.rawData) ? result.rawData : [];
  const rawDeviceInfo = result.deviceInfo ?? {};

  // Field names are captured before stripping, so the UI can still report what
  // the device returned; the values leave the transport layer stripped.
  const decodedFieldNames = Object.keys(rawDeviceInfo).sort();
  const containsApplicationKey = Object.prototype.hasOwnProperty.call(
    rawDeviceInfo,
    'applicationKey',
  );

  const {payload: deviceInfo, removed: removedSecrets} =
    stripKeyMaterial(rawDeviceInfo);

  return {
    rawByteCount: rawData.length,
    elapsedMs: Date.now() - startedAt,
    rawHexPreview: toHexPreview(rawData),
    decodedFieldNames,
    containsApplicationKey,
    removedSecrets,
    deviceInfo,
  };
}

export {describeError};
