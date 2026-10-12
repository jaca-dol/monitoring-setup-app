import {useCallback, useEffect, useState} from 'react';

import {
  IDLE_PROGRESS,
  subscribeToNfcProgress,
  type NfcProgress,
} from '../../transport/nfc/progress';

/**
 * Live NFC progress for the sheet.
 *
 * Subscribes once for the lifetime of the screen rather than per operation, so
 * the `beforeStart` event — which fires before the caller's promise is even
 * created — is never missed. That event is the "armed, waiting for a tag"
 * state, the one Android gives no system feedback for.
 *
 * **The caller's promise decides the terminal outcome, not the tracker.** The
 * SDK emits its `error` event for recoverable failures too: a UC501's first
 * read of a session probes for IPSOv2, that probe times out and emits `error`,
 * and the read then completes over the legacy path. Only `fail()` puts the
 * sheet into an error state.
 */
export function useNfcProgress(): {
  progress: NfcProgress;
  /** True while an operation is armed or running. */
  active: boolean;
  /** Marks the operation as failed, from the caller's catch block. */
  fail: (message: string) => void;
  /** Returns the sheet to idle. */
  reset: () => void;
} {
  const [progress, setProgress] = useState<NfcProgress>(IDLE_PROGRESS);

  useEffect(() => subscribeToNfcProgress(setProgress), []);

  const fail = useCallback((message: string) => {
    setProgress(current => ({...current, phase: 'error', message}));
  }, []);

  const reset = useCallback(() => setProgress(IDLE_PROGRESS), []);

  return {
    progress,
    active: progress.phase !== 'idle',
    fail,
    reset,
  };
}
