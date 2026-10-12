import NfcManager, {NfcEvents} from 'react-native-nfc-manager';

/**
 * NFC session state management.
 *
 * Android hands out a `Tag` handle per discovery event, and that handle dies
 * once the tag leaves the RF field or something else connects to it. Two
 * separate discovery mechanisms are in play here — `registerTagEvent()` for the
 * vendor-independent identify probe, and `requestTechnology()` inside
 * toolbox-sdk — and leaving one armed while starting the other produces
 * `fail to connect tag` from `TagTechnologyRequest.connect()`, which is thrown
 * by `mTech.connect()` on a handle that is no longer live.
 *
 * Everything here is best-effort: each teardown step throws when there was
 * nothing to tear down, and that is not an error worth surfacing.
 */

/** Milliseconds to let the native NFC stack settle after a teardown. */
const SETTLE_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Returns the NFC stack to a known-idle state: no technology request pending,
 * no tag-event registration, no discovery listener attached.
 *
 * Call before starting any scan, so a scan never inherits the previous one's
 * state.
 */
export async function resetNfcSession(): Promise<void> {
  try {
    await NfcManager.cancelTechnologyRequest();
  } catch {
    // no technology request in flight
  }

  try {
    NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
  } catch {
    // no listener attached
  }

  try {
    await NfcManager.unregisterTagEvent();
  } catch {
    // no tag event registered
  }

  await delay(SETTLE_MS);
}
