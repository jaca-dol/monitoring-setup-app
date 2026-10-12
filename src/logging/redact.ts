/**
 * Redaction for anything on its way to a log sink.
 *
 * Why this exists: `toolbox-sdk` logs decoded device payloads unconditionally
 * — `NfcController.readFlash()` calls `LOGI('read flash deviceInfo', ...)` on
 * every successful read with no `__DEV__` guard, and its own logger is a bare
 * `console.*` wrapper with no level filter and no sanitiser. REQ-A-15 says
 * AppKeys are never displayed, extractable, logged, or exported.
 *
 * See docs/sdk-pre-stage1-review.md §2 for the full analysis.
 *
 * Pure functions only — no I/O, no React, no SDK imports — so this is unit
 * testable without hardware.
 */

/**
 * Keys whose values must never reach a log, matched case-insensitively.
 *
 * The first five mirror `PrivateKeysLength` in the SDK's
 * `utils/util/privateKeys.ts`. `password` covers the device access password
 * (REQ-A-03). `encryptionKey` covers the SDK's MMKV storage key.
 */
const SENSITIVE_KEYS: readonly string[] = [
  'applicationkey',
  'applicationsessionkey',
  'networksessionkey',
  'appskey',
  'nwkskey',
  'appkey',
  'nwkkey',
  'password',
  'encryptionkey',
  'secret',
  'token',
];

/**
 * A standalone run of exactly 32 hex characters — the wire length of an
 * AppKey, AppSKey or NwkSKey.
 *
 * This is the backstop for values that arrive as raw text rather than as an
 * object field: the SDK's `Log.e('NFC', 'is not support device info', flashInfo)`
 * error branch logs the device's raw JSON as a string, so key-name matching
 * alone would miss it.
 *
 * A DevEUI is 16 hex characters and is meant to be displayed (PRD B3), so the
 * boundaries here matter: they keep this from matching a shorter identifier or
 * a slice of a longer hex blob.
 */
const HEX32 = /\b[0-9a-fA-F]{32}\b/g;

/** Guards against pathological or cyclic structures. */
const MAX_DEPTH = 8;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.includes(key.toLowerCase());
}

function describe(value: unknown): string {
  if (typeof value === 'string') {
    return `<redacted:${value.length} chars>`;
  }
  return '<redacted>';
}

/** Replaces 32-hex runs inside a string, leaving the rest readable. */
export function redactString(value: string): string {
  return value.replace(HEX32, '<redacted:32-hex>');
}

/**
 * Returns a copy of `value` with every sensitive field replaced by a
 * placeholder that preserves length but not content.
 *
 * The shape of the data is deliberately kept intact: the point is that a
 * bring-up session can still see *that* a payload came back and what fields it
 * carried, without the secrets themselves ending up in the device log.
 */
export function redact(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return '<redacted:max-depth>';
  }

  if (seen.has(value)) {
    return '<circular>';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map(item => redact(item, depth + 1, seen));
  }

  if (value instanceof Error) {
    return value;
  }

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = isSensitiveKey(key)
      ? describe(item)
      : redact(item, depth + 1, seen);
  }
  return out;
}

/** Applies {@link redact} across a whole argument list. */
export function redactArgs(args: readonly unknown[]): unknown[] {
  return args.map(arg => redact(arg));
}
