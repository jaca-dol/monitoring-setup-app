/**
 * Runtime tuning for the SDK's NFC layer.
 *
 * The knobs here target a specific, vendor-acknowledged quirk. `NfcIPSOAction`
 * carries this comment against its timeout branch:
 *
 *   "部分旧设备，如 EM500v1/EM300 v2/UC50X v2/v3 和 WS50X v1 存在 NFC 未切方向的
 *    遗留问题，超时失败后需要延迟再执行后续动作"
 *
 * — "some older devices, such as EM500 v1 / EM300 v2 / **UC50X v2/v3** and
 * WS50X v1, have a legacy problem where the NFC direction has not been
 * switched; after a timeout failure you need to delay before running subsequent
 * actions."
 *
 * That is the NTAG I2C SRAM pass-through direction bit. A read is: reader
 * writes a request into SRAM, the direction flips, the MCU writes its response
 * back. On the affected devices the flip is slow, so the reader polls for a
 * response that is not there yet. The UC501 is a UC50X.
 *
 * The lever is therefore **delay**, not timeout. The SDK already ships a second
 * set of much longer delays behind its internal `NfcDebug` flag (hardcoded
 * false); `SLOW_TIMING` is those values, reachable at runtime through
 * `setConfig`.
 *
 * Everything is best-effort. A tuning failure must never stop a read.
 */

export interface NfcTiming {
  transceiveTimeout: number;
  maxRetries: number;
  sendCommandDelay: number;
  afterSendCommandDelay: number;
  afterSendDataDelay: number;
}

/** The SDK's shipping defaults, with a little more retry headroom. */
export const STOCK_TIMING: NfcTiming = {
  transceiveTimeout: 1200,
  maxRetries: 3,
  sendCommandDelay: 500,
  afterSendCommandDelay: 250,
  afterSendDataDelay: 200,
};

/**
 * The SDK's own `NfcDebug: true` delays — roughly 3-6x longer at every step.
 * These exist in the vendor's code specifically for marginal devices, which is
 * what makes them the right first thing to try on a UC50X.
 */
export const SLOW_TIMING: NfcTiming = {
  transceiveTimeout: 3000,
  maxRetries: 3,
  sendCommandDelay: 1500,
  afterSendCommandDelay: 1355,
  afterSendDataDelay: 1455,
};

export type TimingProfile = 'stock' | 'slow';

export function timingFor(profile: TimingProfile): NfcTiming {
  return profile === 'slow' ? SLOW_TIMING : STOCK_TIMING;
}

interface SdkWithConfig {
  NFC?: {setConfig?: (config: Record<string, unknown>) => void};
}

/** Pushes a timing profile into the SDK's NFC proxy config. */
export function applyNfcTiming(profile: TimingProfile): boolean {
  try {
    const sdk = require('toolbox-sdk') as SdkWithConfig;
    if (typeof sdk.NFC?.setConfig !== 'function') {
      return false;
    }
    sdk.NFC.setConfig({...timingFor(profile)});
    return true;
  } catch (error) {
    console.warn('[tuning] could not apply NFC timing', error);
    return false;
  }
}

interface IpsoCache {
  SupportIPSOActionCache?: {
    setSupportIPSOAction?: (id: string, support: boolean) => void;
    removeSupportIPSOAction?: (id: string) => void;
  };
}

function loadIpsoCache(): IpsoCache['SupportIPSOActionCache'] {
  // Imported from the compiled subpath because the SDK's root barrel does not
  // re-export it. Metro resolves this because `unstable_enablePackageExports`
  // is false.
  const mod =
    require('toolbox-sdk/lib/module/service/action/SupportIPSOActionCache.js') as IpsoCache;
  return mod.SupportIPSOActionCache;
}

/**
 * Forces the SDK down its legacy (pre-IPSOv2) read path for one tag.
 *
 * **This is usually the wrong thing for a UC50X.** Hardware testing showed the
 * IPSOv2 path getting materially further — it writes its request successfully
 * (`sendData success | dataSize 9`) and only then times out waiting for the
 * response — whereas the legacy path fails immediately at `checkWriteable` with
 * `transceive fail`. Skipping trades a late failure for an early one.
 *
 * Kept because it is the only way to compare the two paths on one device, and
 * because a genuinely old device would need it. Off by default.
 */
export function markTagAsLegacyProtocol(tagId: string): boolean {
  if (!tagId) {
    return false;
  }
  try {
    const cache = loadIpsoCache();
    if (typeof cache?.setSupportIPSOAction !== 'function') {
      return false;
    }
    cache.setSupportIPSOAction(tagId, false);
    return true;
  } catch (error) {
    console.warn('[tuning] could not seed IPSO support cache', error);
    return false;
  }
}

/** Undoes {@link markTagAsLegacyProtocol} so the SDK probes normally again. */
export function clearIpsoSupportHint(tagId: string): boolean {
  if (!tagId) {
    return false;
  }
  try {
    const cache = loadIpsoCache();
    if (typeof cache?.removeSupportIPSOAction !== 'function') {
      return false;
    }
    cache.removeSupportIPSOAction(tagId);
    return true;
  } catch {
    return false;
  }
}
