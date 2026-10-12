/**
 * In-memory ring buffer of recent log lines, so the probe screen can show what
 * happened without a USB cable and adb.
 *
 * Everything here arrives *after* redaction — the console wrapper in
 * `install.ts` redacts first, then feeds this. Nothing sensitive should reach
 * the buffer, and therefore nothing sensitive reaches the screen.
 */

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  at: number;
  level: LogLevel;
  text: string;
}

const MAX_ENTRIES = 300;

let entries: LogEntry[] = [];
let listeners: Array<() => void> = [];

function format(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function appendLog(level: LogLevel, args: readonly unknown[]): void {
  entries.push({at: Date.now(), level, text: args.map(format).join(' ')});
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(-MAX_ENTRIES);
  }
  for (const listener of listeners) {
    listener();
  }
}

export function getLogs(): readonly LogEntry[] {
  return entries;
}

export function clearLogs(): void {
  entries = [];
  for (const listener of listeners) {
    listener();
  }
}

/** Subscribes to buffer changes. Returns an unsubscribe function. */
export function subscribeToLogs(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

/** Renders the buffer as plain text, newest last. */
export function formatLogs(): string {
  return entries
    .map(e => {
      const t = new Date(e.at).toISOString().slice(11, 23);
      return `${t} ${e.level.toUpperCase()} ${e.text}`;
    })
    .join('\n');
}
