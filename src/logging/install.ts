import {appendLog} from './logBuffer';
import {redactArgs} from './redact';

/**
 * Installs redaction in front of every log sink the app and the SDK use.
 *
 * Two sinks, because one is not enough:
 *
 * 1. **The global `console`.** `toolbox-sdk` makes 97 direct `console.*` calls
 *    across 35 files in its compiled output, bypassing its own injectable
 *    logger entirely. Wrapping `console` is the only thing that covers them.
 * 2. **The SDK's `setLogger`/`setLog` hooks.** Covers the calls that *do* route
 *    through `utils/logger`, and means the SDK's own tagging survives.
 *
 * Neither replaces the vendored patch in `patches/toolbox-sdk+2.1.6.patch`:
 * that one redacts a plaintext password at its source, which is better than
 * catching it at the sink.
 *
 * Call this as early as possible — before any NFC read, and ideally before the
 * SDK is first imported.
 */

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug';

const WRAPPED_METHODS: readonly ConsoleMethod[] = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
];

let installed = false;

/**
 * Wraps the global console so every argument passes through redaction, then
 * mirrors the redacted result into the in-app log buffer.
 *
 * Order matters: redact first, buffer second. The buffer is rendered on screen
 * during bring-up, so anything that reached it unredacted would be displayed.
 */
function installConsoleRedaction(): void {
  for (const method of WRAPPED_METHODS) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      const safe = redactArgs(args);
      original(...safe);
      appendLog(method, safe);
    };
  }
}

/**
 * Minimal shape of the logger hooks `toolbox-sdk` exports. Declared
 * structurally rather than imported so this module does not pull the SDK — and
 * with it the BLE and WiFi module graph — into the bundle on its own.
 */
export interface SdkLoggerHooks {
  setLogger?: (logger: {
    extend: (tag: string) => Record<string, unknown>;
  }) => void;
  setLog?: (log: Record<string, unknown>) => void;
}

/**
 * Points the SDK's logger hooks at redacting implementations.
 *
 * Pass the SDK module in rather than importing it here, so the caller controls
 * when the SDK graph is loaded.
 */
export function installSdkRedactingLogger(sdk: SdkLoggerHooks): void {
  const emit =
    (method: ConsoleMethod) =>
    (...args: unknown[]) =>
      console[method](...redactArgs(args));

  sdk.setLogger?.({
    extend: (tag: string) => ({
      info: (...args: unknown[]) => emit('info')(`[${tag}]`, ...args),
      warn: (...args: unknown[]) => emit('warn')(`[${tag}]`, ...args),
      error: (...args: unknown[]) => emit('error')(`[${tag}]`, ...args),
      debug: (...args: unknown[]) => emit('debug')(`[${tag}]`, ...args),
    }),
  });

  sdk.setLog?.({
    i: emit('info'),
    w: emit('warn'),
    e: emit('error'),
    d: emit('debug'),
  });
}

/**
 * Installs console redaction. Idempotent — calling it twice will not stack
 * wrappers.
 */
export function installRedactingLogger(): void {
  if (installed) {
    return;
  }
  installed = true;
  installConsoleRedaction();
}

/** Test seam: forgets that installation happened. Does not unwrap console. */
export function resetInstalledFlagForTests(): void {
  installed = false;
}
