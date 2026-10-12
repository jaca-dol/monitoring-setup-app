/**
 * Live progress for an NFC operation.
 *
 * Android gives the app nothing here. iOS shows a system NFC sheet with its own
 * "Hold Near Tag" chrome, which is why the Milesight app appears to have
 * feedback for free on an iPhone — it does not on Android, where the only cue
 * is the handset's tag-discovery vibration. This is the source the app needs to
 * draw its own.
 *
 * The SDK's `NfcTracker` already emits everything required: it tracks a step
 * count per command type and smooths large jumps, which is what produced the
 * "平滑过渡" (smooth transition) lines in the bring-up logs.
 *
 * Best-effort throughout. A missing or renamed event must degrade to "no
 * progress shown", never break a read.
 */

export type NfcPhase =
  | 'idle'
  /** Listener armed, waiting for the phone to meet a tag. */
  | 'waiting'
  /** Tag found, exchange under way. */
  | 'working'
  | 'success'
  | 'error';

export interface NfcProgress {
  phase: NfcPhase;
  /** 0–1. Null while waiting, before the first step. */
  fraction: number | null;
  /** Command the SDK is running, e.g. `readFlash`. */
  command: string | null;
  /** Terminal failure. Only ever set by the caller, never by a tracker event. */
  message: string | null;
  /**
   * A step failed but the operation is still going.
   *
   * The SDK emits its `error` event for **recoverable** failures too. On a
   * UC501 the first read of an app session probes for IPSOv2, that probe times
   * out, the tracker emits `error`, and the SDK then falls back to the legacy
   * path and completes normally. Treating that event as terminal showed a
   * failure on a read that went on to succeed — and only on the first read,
   * because `SupportIPSOActionCache` short-circuits the probe afterwards.
   *
   * So tracker errors land here, and only the caller's promise decides the
   * terminal outcome.
   */
  notice: string | null;
}

export const IDLE_PROGRESS: NfcProgress = {
  phase: 'idle',
  fraction: null,
  command: null,
  message: null,
  notice: null,
};

type Listener = (progress: NfcProgress) => void;

interface Subscription {
  remove: () => void;
}

interface TrackerHost {
  addEventListener?: (
    name: string,
    callback: (...args: unknown[]) => void,
  ) => Subscription;
}

const EVENTS = {
  beforeStart: 'beforeStart',
  start: 'start',
  progress: 'progress',
  success: 'success',
  error: 'error',
  sessionClose: 'sessionClose',
} as const;

function asFraction(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(1, value));
}

function asText(value: unknown): string | null {
  if (typeof value === 'string' && value !== '') {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  return null;
}

/**
 * Subscribes to the SDK's NFC tracker.
 *
 * Returns an unsubscribe function. Safe to call when the SDK is absent — the
 * caller simply never receives an update.
 */
export function subscribeToNfcProgress(listener: Listener): () => void {
  let host: TrackerHost;
  try {
    const sdk = require('toolbox-sdk') as {NFC?: TrackerHost};
    if (
      sdk.NFC === undefined ||
      typeof sdk.NFC.addEventListener !== 'function'
    ) {
      return () => undefined;
    }
    host = sdk.NFC;
  } catch (error) {
    console.warn('[nfc] could not subscribe to progress events', error);
    return () => undefined;
  }

  let current: NfcProgress = IDLE_PROGRESS;

  const emit = (next: Partial<NfcProgress>) => {
    current = {...current, ...next};
    listener(current);
  };

  const subscriptions: Subscription[] = [];
  const on = (name: string, callback: (...args: unknown[]) => void) => {
    try {
      const sub = host.addEventListener?.(name, callback);
      if (sub !== undefined) {
        subscriptions.push(sub);
      }
    } catch {
      // An event this SDK build does not emit is not worth failing over.
    }
  };

  // Armed, but the phone has not met a tag yet. This is the state Android
  // otherwise gives no sign of at all.
  on(EVENTS.beforeStart, () => {
    emit({phase: 'waiting', fraction: null, message: null, notice: null});
  });

  on(EVENTS.start, (command: unknown) => {
    emit({phase: 'working', fraction: 0, command: asText(command)});
  });

  on(EVENTS.progress, (fraction: unknown, command: unknown) => {
    emit({
      phase: 'working',
      fraction: asFraction(fraction),
      command: asText(command) ?? current.command,
      // Progress after a notice means the SDK recovered; clear it.
      notice: null,
    });
  });

  on(EVENTS.success, (command: unknown) => {
    emit({
      phase: 'success',
      fraction: 1,
      command: asText(command) ?? current.command,
      notice: null,
    });
  });

  // Recorded, not raised. See the `notice` field for why the SDK's error event
  // is not a terminal outcome.
  on(EVENTS.error, (error: unknown, message: unknown) => {
    emit({notice: asText(message) ?? asText(error)});
  });

  // The tag left the field. Only meaningful mid-exchange; ignored once the
  // operation has already resolved either way.
  on(EVENTS.sessionClose, () => {
    if (current.phase === 'working' || current.phase === 'waiting') {
      emit({phase: 'waiting', fraction: null});
    }
  });

  return () => {
    for (const sub of subscriptions) {
      try {
        sub.remove();
      } catch {
        // Already removed.
      }
    }
  };
}
