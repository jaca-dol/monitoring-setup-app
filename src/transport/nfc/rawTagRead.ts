import NfcManager, {NfcTech} from 'react-native-nfc-manager';

import {describeError} from './capability';
import {resetNfcSession} from './session';

/**
 * Raw NTAG read — the test that separates "no power" from "no link".
 *
 * `GET_VERSION` (0x60) and `READ` (0x30) are answered by the NTAG silicon
 * itself, powered entirely by the reader's RF field. They do not involve the
 * sensor's MCU at all.
 *
 * The SDK's `checkWriteable` is the opposite: it polls the NTAG I2C session
 * register waiting for the MCU behind the tag to service the SRAM. So:
 *
 * - raw read works, SDK read fails  → RF link and tag are fine; the MCU is not
 *   responding, i.e. the sensor is unpowered or asleep
 * - raw read also fails             → the problem is the RF link itself, not power
 *
 * That is a question static analysis cannot answer and antenna-wiggling cannot
 * distinguish, which is why it is worth its own probe.
 */

export interface RawTagReadResult {
  /** GET_VERSION response, hex. Empty when the tag did not answer it. */
  versionHex: string;
  /** Human-readable interpretation of GET_VERSION, when recognisable. */
  versionSummary: string;
  /** First 16 bytes of tag memory (pages 0-3), hex. */
  page0Hex: string;
  /** Interpretation of the Capability Container, when readable. */
  capabilityContainer: string;
  /** True when the tag answered at least one command from its own silicon. */
  tagRespondedWithoutMcu: boolean;
}

function toHex(bytes: readonly number[]): string {
  return bytes
    .map(b => (((b % 256) + 256) % 256).toString(16).padStart(2, '0'))
    .join(' ')
    .toUpperCase();
}

/**
 * Known NXP NTAG I2C parts, keyed by
 * `productType:subtype:major:minor:storage` from GET_VERSION.
 *
 * The storage byte differs from the plain NTAG21x series: 0x13 is 1k and 0x15
 * is 2k here, where NTAG213/215/216 use 0x0F/0x11/0x13. Getting this wrong
 * misreports the part, and part size decides the sector layout the SDK's
 * protocol addresses.
 */
const NTAG_PARTS: Record<string, string> = {
  '4:1:1:0:19': 'NT3H1101 — NTAG I2C 1k',
  '4:1:1:0:21': 'NT3H1201 — NTAG I2C 2k',
  '4:5:2:2:19': 'NT3H2111 — NTAG I2C plus 1k',
  '4:5:2:2:21': 'NT3H2211 — NTAG I2C plus 2k',
};

/**
 * Decodes the NXP GET_VERSION response.
 * Layout: header, vendor, product type, subtype, major, minor, storage, protocol.
 */
function summariseVersion(v: readonly number[]): string {
  if (v.length < 8) {
    return 'no GET_VERSION response';
  }

  const vendor = v[1] === 0x04 ? 'NXP' : `vendor 0x${(v[1] ?? 0).toString(16)}`;
  const key = `${v[2]}:${v[3]}:${v[4]}:${v[5]}:${v[6]}`;
  const part = NTAG_PARTS[key];

  if (part) {
    return `${vendor} ${part}`;
  }

  return `${vendor}, unrecognised part (type ${v[2]}, subtype ${v[3]}, v${
    v[4]
  }.${v[5]}, storage 0x${(v[6] ?? 0).toString(16)})`;
}

/**
 * Reads the Capability Container (page 3) out of a pages 0-3 READ.
 *
 * An all-zero CC means the tag has never been NDEF-formatted. On a sensor whose
 * host MCU writes its own tag content, a blank CC is evidence the MCU has never
 * run — which is exactly the question this probe exists to answer.
 */
function summariseCapabilityContainer(pages: readonly number[]): string {
  if (pages.length < 16) {
    return '';
  }
  const cc = pages.slice(12, 16);
  const blank = cc.every(b => b === 0);
  return blank
    ? 'Capability Container is blank — the tag has never been formatted or written by a host MCU.'
    : `Capability Container: ${toHex(cc)}`;
}

async function tryTransceive(command: number[]): Promise<number[]> {
  try {
    const response = await NfcManager.transceive(command);
    return Array.isArray(response) ? response : [];
  } catch {
    return [];
  }
}

export async function rawTagRead(): Promise<RawTagReadResult> {
  await resetNfcSession();

  try {
    await NfcManager.requestTechnology(NfcTech.NfcA);

    const version = await tryTransceive([0x60]);
    const page0 = await tryTransceive([0x30, 0x00]);

    return {
      versionHex: toHex(version),
      versionSummary: summariseVersion(version),
      page0Hex: toHex(page0),
      capabilityContainer: summariseCapabilityContainer(page0),
      tagRespondedWithoutMcu: version.length > 0 || page0.length > 0,
    };
  } catch (error) {
    throw new Error(describeError(error));
  } finally {
    await resetNfcSession();
  }
}
