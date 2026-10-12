import {RSSI_GOOD_ABOVE_DBM, RSSI_UNUSABLE_BELOW_DBM} from '../config/signal';
import type {ConnectionState} from '../domain/device';
import type {SignalVerdict} from '../domain/screen';

/**
 * The signal verdict of PRD B5 (REQ-A-11, roadmap task 10).
 *
 * **This implements exactly the table in B5 and nothing more.** That table is
 * defined on RSSI and connection state alone:
 *
 * | Verdict      | Condition                          |
 * | ------------ | ---------------------------------- |
 * | Good         | RSSI better than −95 dBm           |
 * | Weak         | RSSI −95 to −100 dBm               |
 * | Unusable     | RSSI below −100 dBm                |
 * | Disconnected | No uplink has reached the gateway  |
 *
 * The open question in B5 is how to *present* SNR — a 0–20 scale or a minimum
 * threshold. That decision is not needed here, because no verdict in the table
 * depends on SNR. SNR is carried through and displayed as a value; nothing
 * grades it. When the decision lands it changes presentation in
 * `src/config/signal.ts`, not this function.
 *
 * Pure. Every branch is unit-testable against the captured fixtures.
 */

/**
 * Disconnected wins outright.
 *
 * B5 says so — "shown regardless of signal strength" — and the hardware makes
 * it load-bearing rather than pedantic. A UC501 that has never joined reports
 * `rssi: 0`, and 0 dBm is "better than −95", so evaluating RSSI first would
 * render **Good** for a sensor that has never transmitted. That is the worst
 * failure this component could have: it would tell an installer to walk away
 * from a sensor that is not working.
 */
export function signalVerdict(
  connection: ConnectionState,
  rssiDbm: number | null,
): SignalVerdict {
  if (connection === 'disconnected') {
    return 'disconnected';
  }
  if (rssiDbm === null) {
    return 'disconnected';
  }
  if (rssiDbm > RSSI_GOOD_ABOVE_DBM) {
    return 'good';
  }
  if (rssiDbm >= RSSI_UNUSABLE_BELOW_DBM) {
    return 'weak';
  }
  return 'unusable';
}

/**
 * Whether a reported RSSI/SNR pair is a real reading.
 *
 * A device that has never joined reports `0/0`. Treating that as a measurement
 * is what produces the false "Good" above, so it is normalised to null at the
 * edge and everything downstream sees "no reading".
 */
export function readingOrNull(
  value: number | null | undefined,
  joined: boolean,
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  if (!joined && value === 0) {
    return null;
  }
  return value;
}
