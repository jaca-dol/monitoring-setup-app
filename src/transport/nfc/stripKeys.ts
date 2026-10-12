/**
 * Removes LoRaWAN key material from a decoded payload at the transport
 * boundary, before it reaches any other layer.
 *
 * Hardware testing confirmed the UC501 returns real `applicationKey`,
 * `applicationSessionKey`, `networkSessionKey` and per-multicast
 * `appskey`/`nwkskey` values on an ordinary NFC read. The SDK's own
 * `padPrivateKeys` does not help: it fills in fields that are *absent* and
 * passes through fields that are present.
 *
 * REQ-A-15 says AppKeys are never displayed, extractable, logged or exported.
 * The cheapest way to hold that line is to make sure cleartext key material
 * never leaves `src/transport` at all — so the domain model, the UI, the store
 * and anything that serialises device state cannot leak what they never had.
 *
 * This is deliberately *destructive*: it does not mask to a fixed-width
 * placeholder that could be mistaken for a value, and it does not keep the
 * original anywhere. Writing keys back is out of scope here; when the write
 * path needs them (Stage 6), it must take them from a freshly-read payload
 * inside the transport layer, never from the domain model.
 */

/** Top-level fields that carry key material. */
const SECRET_FIELDS = [
  'applicationKey',
  'applicationSessionKey',
  'networkSessionKey',
  'appskey',
  'nwkskey',
] as const;

/** Fields carrying key material inside each `multicast[]` entry. */
const MULTICAST_SECRET_FIELDS = ['appskey', 'nwkskey'] as const;

export interface StripResult {
  payload: Record<string, unknown>;
  /** Names of the fields that actually carried a value. */
  removed: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns a copy with key material removed, plus the list of fields that were
 * present. The caller reports the list — that is how REQ-A-15 compliance stays
 * observable without the values themselves ever being handled.
 */
export function stripKeyMaterial(
  payload: Record<string, unknown>,
): StripResult {
  const out: Record<string, unknown> = {...payload};
  const removed: string[] = [];

  for (const field of SECRET_FIELDS) {
    if (field in out) {
      if (
        out[field] !== undefined &&
        out[field] !== null &&
        out[field] !== ''
      ) {
        removed.push(field);
      }
      delete out[field];
    }
  }

  if (Array.isArray(out.multicast)) {
    out.multicast = out.multicast.map((entry, index) => {
      if (!isPlainObject(entry)) {
        return entry;
      }
      const copy = {...entry};
      for (const field of MULTICAST_SECRET_FIELDS) {
        if (field in copy) {
          if (
            copy[field] !== undefined &&
            copy[field] !== null &&
            copy[field] !== ''
          ) {
            removed.push(`multicast[${index}].${field}`);
          }
          delete copy[field];
        }
      }
      return copy;
    });
  }

  return {payload: out, removed};
}
