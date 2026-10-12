import type {MeasurementCapability} from '../domain/device';
import type {MeasurementReading} from '../domain/screen';

/**
 * Pulls the last measured values out of a payload (REQ-A-07).
 *
 * Source is the payload's own `status[]` array, which the Stage 1 reads showed
 * is the device's read-out list — each entry carries `name`, `value`, and where
 * relevant `unit` and `type`:
 *
 * ```
 * {name: 'CO2 concentration', value: '497', unit: 'ppm', type: 'co2concentration'}
 * {name: 'temperature',       value: '18.5', unit: '℃',  type: 'temperature'}
 * ```
 *
 * Using it beats re-deriving values from the scattered top-level fields: the
 * device has already decided what is a measurement (only those entries carry
 * `type`), already formatted the value, and already named the unit.
 *
 * Capability order wins over payload order, so the Measurement card shows the
 * same values in the same places on every unit of a given type.
 */

/** `status[].type` → capability key. */
const TYPE_TO_KEY: Record<string, string> = {
  temperature: 'temperature',
  humidity: 'humidity',
  co2concentration: 'co2',
  atmosphericpressure: 'pressure',
};

interface StatusEntry {
  name?: unknown;
  value?: unknown;
  unit?: unknown;
  type?: unknown;
}

function asString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
}

/**
 * The devices report °C as `℃` (U+2103) and humidity as a bare `%`. The
 * capability list is the place unit wording is decided, so display units come
 * from there; the payload's unit is only a fallback for a value the capability
 * list does not describe.
 */
interface StatusIndex {
  /** Typed entries, keyed by capability key. The normal path. */
  byKey: Map<string, StatusEntry>;
  /** Every entry, keyed by its `name`, for channels the device leaves untyped. */
  byName: Map<string, StatusEntry>;
}

function readStatusEntries(payload: Record<string, unknown>): StatusIndex {
  const byKey = new Map<string, StatusEntry>();
  const byName = new Map<string, StatusEntry>();
  const status = payload.status;
  if (!Array.isArray(status)) {
    return {byKey, byName};
  }

  for (const raw of status) {
    if (typeof raw !== 'object' || raw === null) {
      continue;
    }
    const entry = raw as StatusEntry;

    const name = asString(entry.name);
    if (name !== '') {
      byName.set(name.toLowerCase(), entry);
    }

    const type = asString(entry.type);
    if (type === '') {
      // No `type` means the device does not call it a measurement. Usually that
      // is identity or link state; on the EM300-DI it is also the digital
      // input, which a capability can opt into by name.
      continue;
    }
    const key = TYPE_TO_KEY[type.toLowerCase()];
    if (key !== undefined) {
      byKey.set(key, entry);
    }
  }
  return {byKey, byName};
}

/**
 * Builds one reading per declared capability, in capability order.
 *
 * A capability the device did not report comes back with a null value rather
 * than being dropped, so a missing channel shows as "—" instead of silently
 * changing the shape of the card.
 */
export function extractMeasurements(
  payload: Record<string, unknown>,
  capabilities: readonly MeasurementCapability[],
): MeasurementReading[] {
  const {byKey, byName} = readStatusEntries(payload);

  return capabilities.map(capability => {
    const entry =
      byKey.get(capability.key) ??
      (capability.statusName === undefined
        ? undefined
        : byName.get(capability.statusName.toLowerCase()));

    return {
      key: capability.key,
      label: capability.label,
      value: entry === undefined ? null : formatValue(entry.value, capability),
      unit: capability.unit,
    };
  });
}

/**
 * A reported value as text, or null when there is nothing to show.
 *
 * `false` is a real reading on a digital input, so it must not be treated as
 * absent — which is exactly what a plain falsy check would do.
 */
function formatValue(
  value: unknown,
  capability: MeasurementCapability,
): string | null {
  if (typeof value === 'boolean') {
    const labels = capability.booleanLabels;
    if (labels === undefined) {
      return null;
    }
    return value ? labels[1] : labels[0];
  }
  const text = asString(value);
  return text === '' ? null : text;
}

/** Reads `deviceTime` (epoch seconds) as epoch milliseconds. */
export function readDeviceTime(
  payload: Record<string, unknown>,
): number | null {
  const seconds = payload.deviceTime;
  if (
    typeof seconds !== 'number' ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return null;
  }
  return seconds * 1000;
}
