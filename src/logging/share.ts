import {Share} from 'react-native';

import {formatLogs} from './logBuffer';

/**
 * Gets a diagnostic bundle off the phone without a cable.
 *
 * Bring-up sessions happen wherever the sensor is, which is not necessarily
 * next to the development machine. Photographing the screen and OCR-ing it is
 * not a workflow. `Share` is in React Native core, so this costs no dependency
 * and no permission.
 *
 * Everything shared has already been through redaction — the log buffer is fed
 * from the redacting console wrapper, and the summary below carries field
 * *names* only, never values. That matters here: these devices do return a real
 * AppKey (REQ-A-15), so a diagnostic dump is exactly the kind of thing that
 * must not leak one.
 */

export interface DiagnosticSummary {
  /** Tag UID, if one has been identified. */
  tagId?: string;
  /** Timing profile the read ran under. */
  timing?: string;
  /** Whether the legacy protocol path was forced. */
  forcedLegacy?: boolean;
  /** Free-form outcome lines, e.g. "Read OK, 1798 bytes in 12867 ms". */
  outcome?: string[];
}

/** Characters of log tail to include. Share targets choke on very long text. */
const MAX_LOG_CHARS = 12000;

export function buildDiagnosticText(summary: DiagnosticSummary = {}): string {
  const header = [
    'monitoring setup — Stage 1 diagnostics',
    new Date().toISOString(),
    '',
  ];

  if (summary.tagId) {
    header.push(`Tag UID: ${summary.tagId}`);
  }
  if (summary.timing) {
    header.push(`Timing profile: ${summary.timing}`);
  }
  if (summary.forcedLegacy !== undefined) {
    header.push(`Force legacy: ${summary.forcedLegacy ? 'on' : 'off'}`);
  }
  if (summary.outcome?.length) {
    header.push('', ...summary.outcome);
  }

  const logs = formatLogs();
  const tail =
    logs.length > MAX_LOG_CHARS
      ? `…(truncated)\n${logs.slice(-MAX_LOG_CHARS)}`
      : logs;

  return [...header, '', '--- log ---', tail || '(nothing logged)'].join('\n');
}

export async function shareDiagnostics(
  summary: DiagnosticSummary = {},
): Promise<void> {
  await Share.share({message: buildDiagnosticText(summary)});
}
