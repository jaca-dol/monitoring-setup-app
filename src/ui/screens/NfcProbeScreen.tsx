import React, {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import {describeInputConfig, identifyDevice} from '../../codec/deviceIdentity';
import {WORKING_TITLE} from '../../config';
import {capabilitiesFor} from '../../domain/device';
import {
  clearLogs,
  formatLogs,
  getLogs,
  subscribeToLogs,
} from '../../logging/logBuffer';
import {shareDiagnostics} from '../../logging/share';
import {
  checkNfcAvailability,
  openNfcSettings,
  type NfcAvailability,
} from '../../transport/nfc/capability';
import {
  cancelIdentify,
  identifyTag,
  type TagInfo,
} from '../../transport/nfc/identifyTag';
import {
  cancelProbeRead,
  describeError,
  probeRead,
  type ProbeReadResult,
} from '../../transport/nfc/probeRead';
import {
  rawTagRead,
  type RawTagReadResult,
} from '../../transport/nfc/rawTagRead';
import {
  clearIpsoSupportHint,
  markTagAsLegacyProtocol,
  type TimingProfile,
} from '../../transport/nfc/tuning';
import {colors, spacing} from '../theme';

/**
 * Stage 1 probe screen. Not a product screen — it exists to answer, against
 * real hardware, what static analysis could not:
 *
 *   1. Does the app boot with the SDK's BLE/WiFi module graph unlinked?
 *   2. What does Android actually see when the phone meets this tag?
 *   3. Does a full SDK read complete?
 *   4. Does the payload contain an `applicationKey`? (REQ-A-15)
 *
 * "Identify tag" answers 2 without involving the SDK at all, which is what
 * separates "the SDK cannot talk to this tag" from "the phone never saw a tag".
 * The five-section product screen is Stage 3 and replaces all of this.
 */

function identifyTagId(task: Task<TagInfo>): string {
  return task.phase === 'done' ? task.result.id : '';
}

type Task<T> =
  | {phase: 'idle'}
  | {phase: 'busy'}
  | {phase: 'done'; result: T}
  | {phase: 'failed'; message: string};

export function NfcProbeScreen(): React.JSX.Element {
  const isDark = useColorScheme() === 'dark';
  const [availability, setAvailability] = useState<NfcAvailability | null>(
    null,
  );
  const [identify, setIdentify] = useState<Task<TagInfo>>({phase: 'idle'});
  const [read, setRead] = useState<Task<ProbeReadResult>>({phase: 'idle'});
  const [showLogs, setShowLogs] = useState(false);
  const [skipIpso, setSkipIpso] = useState(false);
  const [timing, setTiming] = useState<TimingProfile>('slow');
  const [rawRead, setRawRead] = useState<Task<RawTagReadResult>>({
    phase: 'idle',
  });
  const lastTagId = identifyTagId(identify);

  const logs = useSyncExternalStore(subscribeToLogs, getLogs);

  // Diagnostics scaffolding, so it just borrows the light palette rather than
  // carrying its own theme. The product screen is light-only per the concept.
  const theme = {
    bg: colors.page,
    fg: colors.ink,
    muted: colors.muted,
    border: colors.divider,
  };

  useEffect(() => {
    let cancelled = false;
    checkNfcAvailability().then(result => {
      if (!cancelled) {
        setAvailability(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onIdentify = useCallback(async () => {
    setIdentify({phase: 'busy'});
    try {
      setIdentify({phase: 'done', result: await identifyTag()});
    } catch (error) {
      setIdentify({phase: 'failed', message: describeError(error)});
    }
  }, []);

  const onRead = useCallback(async () => {
    setRead({phase: 'busy'});
    // The SDK caches IPSO support per tag UID. Seeding it before the read is
    // what skips the ~7s probe; clearing it restores stock behaviour so the
    // two paths can be compared on the same tag.
    if (lastTagId) {
      if (skipIpso) {
        markTagAsLegacyProtocol(lastTagId);
      } else {
        clearIpsoSupportHint(lastTagId);
      }
    }
    try {
      setRead({phase: 'done', result: await probeRead(timing)});
    } catch (error) {
      setRead({phase: 'failed', message: describeError(error)});
    }
  }, [lastTagId, skipIpso, timing]);

  const onRawRead = useCallback(async () => {
    setRawRead({phase: 'busy'});
    try {
      setRawRead({phase: 'done', result: await rawTagRead()});
    } catch (error) {
      setRawRead({phase: 'failed', message: describeError(error)});
    }
  }, []);

  const onShare = useCallback(() => {
    const outcome: string[] = [];
    if (read.phase === 'done') {
      const r = read.result;
      outcome.push(
        `Read OK: ${r.rawByteCount} bytes in ${r.elapsedMs} ms, ${r.decodedFieldNames.length} fields`,
        `applicationKey present: ${r.containsApplicationKey ? 'YES' : 'no'}`,
        `Fields: ${r.decodedFieldNames.join(', ')}`,
      );
    } else if (read.phase === 'failed') {
      outcome.push(`Read failed: ${read.message}`);
    }
    if (rawRead.phase === 'done') {
      outcome.push(`Raw tag: ${rawRead.result.versionSummary}`);
    }
    // Field names only — never values. These devices return a real AppKey.
    void shareDiagnostics({
      tagId: lastTagId,
      timing,
      forcedLegacy: skipIpso,
      outcome,
    });
  }, [read, rawRead, lastTagId, timing, skipIpso]);

  const onCancel = useCallback(async () => {
    await Promise.all([cancelIdentify(), cancelProbeRead()]);
    setIdentify(s => (s.phase === 'busy' ? {phase: 'idle'} : s));
    setRead(s => (s.phase === 'busy' ? {phase: 'idle'} : s));
    setRawRead(s => (s.phase === 'busy' ? {phase: 'idle'} : s));
  }, []);

  const ready = availability?.status === 'ready';
  const busy =
    identify.phase === 'busy' ||
    read.phase === 'busy' ||
    rawRead.phase === 'busy';

  return (
    <SafeAreaView style={[styles.safeArea, {backgroundColor: theme.bg}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, {color: theme.fg}]}>{WORKING_TITLE}</Text>
        <Text style={[styles.subtitle, {color: theme.muted}]}>
          Stage 1 — NFC transport probe
        </Text>

        <Section title="NFC status" theme={theme}>
          {availability === null ? (
            <Text style={[styles.body, {color: theme.muted}]}>Checking…</Text>
          ) : (
            <>
              <Text style={[styles.body, {color: theme.fg}]}>
                {availability.status}
              </Text>
              {availability.status !== 'ready' && (
                <Text style={[styles.body, {color: theme.muted}]}>
                  {availability.message}
                </Text>
              )}
              {availability.status === 'disabled' && (
                <Button
                  label="Open NFC settings"
                  onPress={openNfcSettings}
                  theme={theme}
                />
              )}
            </>
          )}
        </Section>

        <Section title="1. Identify tag" theme={theme}>
          <Text style={[styles.body, {color: theme.muted}]}>
            Does not use the SDK. Reports whatever Android sees, then stops. Try
            this first.
          </Text>
          <Button
            label={
              identify.phase === 'busy' ? 'Waiting for tag…' : 'Identify tag'
            }
            onPress={onIdentify}
            disabled={!ready || busy}
            theme={theme}
          />
          {identify.phase === 'busy' && (
            <ActivityIndicator style={styles.spinner} />
          )}
          {identify.phase === 'failed' && (
            <Text style={[styles.body, styles.failure]}>
              {identify.message}
            </Text>
          )}
          {identify.phase === 'done' && (
            <TagReport tag={identify.result} theme={theme} />
          )}
        </Section>

        <Section title="2. SDK read" theme={theme}>
          <Text style={[styles.body, {color: theme.muted}]}>
            Full toolbox-sdk readFlash. Lift the phone away from the sensor
            first, then press this and tap again — Android invalidates the tag
            handle if the tag never leaves the field. Times out after 20s and
            retries a failed connect once.
          </Text>
          <View style={styles.buttonRow}>
            <Button
              label={`Timing: ${timing}`}
              onPress={() => setTiming(t => (t === 'slow' ? 'stock' : 'slow'))}
              disabled={busy}
              theme={theme}
            />
            <Button
              label={`Force legacy: ${skipIpso ? 'ON' : 'off'}`}
              onPress={() => setSkipIpso(v => !v)}
              disabled={!lastTagId || busy}
              theme={theme}
            />
          </View>
          <Text style={[styles.body, {color: theme.muted}]}>
            Start with Timing: slow, Force legacy: off. On a UC50X the IPSOv2
            path gets further than the legacy one, and the vendor&apos;s own
            longer delays target this device family&apos;s known
            SRAM-direction-switch quirk.
          </Text>
          <Button
            label={read.phase === 'busy' ? 'Reading…' : 'SDK read'}
            onPress={onRead}
            disabled={!ready || busy}
            theme={theme}
          />
          {read.phase === 'busy' && (
            <ActivityIndicator style={styles.spinner} />
          )}
          {read.phase === 'failed' && (
            <Text style={[styles.body, styles.failure]}>{read.message}</Text>
          )}
          {read.phase === 'done' && (
            <ReadReport result={read.result} theme={theme} />
          )}
        </Section>

        <Section title="3. Raw tag read (power test)" theme={theme}>
          <Text style={[styles.body, {color: theme.muted}]}>
            Reads the NTAG chip directly with GET_VERSION and READ. These are
            answered by the tag silicon on RF power alone and never involve the
            sensor&apos;s MCU — so this works even on a dead sensor.
          </Text>
          <Button
            label={
              rawRead.phase === 'busy' ? 'Waiting for tag…' : 'Raw tag read'
            }
            onPress={onRawRead}
            disabled={!ready || busy}
            theme={theme}
          />
          {rawRead.phase === 'busy' && (
            <ActivityIndicator style={styles.spinner} />
          )}
          {rawRead.phase === 'failed' && (
            <Text style={[styles.body, styles.failure]}>{rawRead.message}</Text>
          )}
          {rawRead.phase === 'done' && (
            <RawReport result={rawRead.result} theme={theme} />
          )}
        </Section>

        {busy && (
          <Button label="Cancel scan" onPress={onCancel} theme={theme} />
        )}

        <Section title={`Log (${logs.length})`} theme={theme}>
          <Text style={[styles.body, {color: theme.muted}]}>
            Redacted before display. Secrets appear as &lt;redacted&gt;.
          </Text>
          <View style={styles.buttonRow}>
            <Button
              label={showLogs ? 'Hide' : 'Show'}
              onPress={() => setShowLogs(v => !v)}
              theme={theme}
            />
            <Button label="Clear" onPress={clearLogs} theme={theme} />
            <Button label="Share" onPress={onShare} theme={theme} />
          </View>
          {showLogs && (
            <Text selectable style={[styles.mono, {color: theme.fg}]}>
              {formatLogs() || '(nothing logged yet)'}
            </Text>
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

interface Theme {
  bg: string;
  fg: string;
  muted: string;
  border: string;
}

function TagReport({
  tag,
  theme,
}: {
  tag: TagInfo;
  theme: Theme;
}): React.JSX.Element {
  return (
    <View>
      <Text style={[styles.body, styles.success]}>Tag seen</Text>
      <Row label="UID" value={tag.idFormatted || '(none)'} theme={theme} />
      <Row label="SDK chip type" value={tag.sdkChipType} theme={theme} />
      <Row
        label="Exposes NfcA"
        value={tag.exposesNfcA ? 'yes' : 'NO'}
        theme={theme}
      />
      <Text style={[styles.label, {color: theme.muted}]}>Technologies</Text>
      <Text selectable style={[styles.mono, {color: theme.fg}]}>
        {tag.techTypes.join('\n') || '(none reported)'}
      </Text>
      {!tag.exposesNfcA && (
        <Text style={[styles.body, styles.failure]}>
          The SDK&apos;s Android read path requests NfcA specifically. This tag
          does not expose it, so an SDK read can never complete against it.
        </Text>
      )}
      {tag.sdkChipType === 'unknown' && (
        <Text style={[styles.body, styles.warn]}>
          The SDK classifies chips by UID prefix (04 = NXP NT3H2111, 1D =
          FM17660K). This UID is neither, so this is probably not a Milesight
          sensor tag.
        </Text>
      )}
    </View>
  );
}

function ReadReport({
  result,
  theme,
}: {
  result: ProbeReadResult;
  theme: Theme;
}): React.JSX.Element {
  const identity = identifyDevice(result.deviceInfo);
  const capabilities = capabilitiesFor(identity.typeId);
  const inputs = describeInputConfig(result.deviceInfo);

  return (
    <View>
      <Text style={[styles.body, styles.success]}>Read OK</Text>

      <Text style={[styles.label, {color: theme.muted}]}>
        Stage 2 — identification
      </Text>
      <Row
        label="Device"
        value={identity.typeId ? identity.displayName : 'UNSUPPORTED'}
        theme={theme}
      />
      <Row label="Model" value={identity.model || '(none)'} theme={theme} />
      <Row
        label="Band group"
        value={
          identity.supportedRegions.length
            ? identity.supportedRegions.join(', ')
            : 'unknown'
        }
        theme={theme}
      />
      <Row
        label="Region"
        value={`${identity.currentRegion ?? 'unknown'}${
          identity.regionIsFixed ? ' (fixed)' : ''
        }`}
        theme={theme}
      />
      <Row
        label="Firmware / hardware"
        value={`${identity.firmwareVersion || '?'} / ${
          identity.hardwareVersion || '?'
        }`}
        theme={theme}
      />
      <Row label="DevEUI" value={identity.devEui || '(none)'} theme={theme} />
      {capabilities?.hasActiveInputConfig && (
        <Row
          label="Active input"
          value={inputs.length ? inputs.join(', ') : 'none enabled'}
          theme={theme}
        />
      )}
      <Row
        label="Key material stripped"
        value={
          result.removedSecrets.length
            ? `${result.removedSecrets.length} field(s)`
            : 'none present'
        }
        theme={theme}
      />

      <Text style={[styles.label, {color: theme.muted}]}>Transport</Text>
      <Row
        label="Raw bytes"
        value={String(result.rawByteCount)}
        theme={theme}
      />
      <Row label="Took" value={`${result.elapsedMs} ms`} theme={theme} />
      <Row
        label="Decoded fields"
        value={String(result.decodedFieldNames.length)}
        theme={theme}
      />
      <Row
        label="Contains applicationKey"
        value={result.containsApplicationKey ? 'YES — see REQ-A-15' : 'no'}
        theme={theme}
      />
      <Text style={[styles.label, {color: theme.muted}]}>First bytes</Text>
      <Text selectable style={[styles.mono, {color: theme.fg}]}>
        {result.rawHexPreview || '(none)'}
      </Text>
      <Text style={[styles.label, {color: theme.muted}]}>Field names</Text>
      <Text selectable style={[styles.mono, {color: theme.fg}]}>
        {result.decodedFieldNames.join(', ') || '(none)'}
      </Text>
    </View>
  );
}

function RawReport({
  result,
  theme,
}: {
  result: RawTagReadResult;
  theme: Theme;
}): React.JSX.Element {
  return (
    <View>
      <Text
        style={[
          styles.body,
          result.tagRespondedWithoutMcu ? styles.success : styles.failure,
        ]}>
        {result.tagRespondedWithoutMcu
          ? 'Tag silicon answered'
          : 'Tag did not answer'}
      </Text>
      <Text style={[styles.label, {color: theme.muted}]}>GET_VERSION</Text>
      <Text selectable style={[styles.mono, {color: theme.fg}]}>
        {result.versionHex || '(no response)'}
      </Text>
      <Text style={[styles.body, {color: theme.muted}]}>
        {result.versionSummary}
      </Text>
      <Text style={[styles.label, {color: theme.muted}]}>READ pages 0-3</Text>
      <Text selectable style={[styles.mono, {color: theme.fg}]}>
        {result.page0Hex || '(no response)'}
      </Text>
      {result.capabilityContainer !== '' && (
        <Text style={[styles.body, {color: theme.muted}]}>
          {result.capabilityContainer}
        </Text>
      )}
      {result.tagRespondedWithoutMcu && (
        <Text style={[styles.body, styles.warn]}>
          The tag and the RF link are fine. If the SDK read still fails at
          checkWriteable, the sensor MCU is not responding — the device is
          almost certainly unpowered or asleep.
        </Text>
      )}
    </View>
  );
}

function Row({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: Theme;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.body, {color: theme.muted}]}>{label}</Text>
      <Text selectable style={[styles.body, {color: theme.fg}]}>
        {value}
      </Text>
    </View>
  );
}

function Section({
  title,
  theme,
  children,
}: {
  title: string;
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, {borderColor: theme.border}]}>
      <Text style={[styles.sectionTitle, {color: theme.fg}]}>{title}</Text>
      {children}
    </View>
  );
}

function Button({
  label,
  onPress,
  theme,
  disabled,
}: {
  label: string;
  onPress: () => void;
  theme: Theme;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {borderColor: theme.border},
        disabled && styles.buttonDisabled,
      ]}>
      <Text style={[styles.buttonLabel, {color: theme.fg}]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1},
  content: {padding: spacing.lg},
  title: {fontSize: 22, fontWeight: '600'},
  subtitle: {fontSize: 14, marginTop: spacing.sm / 2},
  section: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {fontSize: 16, fontWeight: '600', marginBottom: spacing.sm},
  body: {fontSize: 15, lineHeight: 22},
  label: {fontSize: 13, marginTop: spacing.md},
  mono: {fontFamily: 'monospace', fontSize: 12, marginTop: spacing.sm / 2},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm / 2,
  },
  buttonRow: {flexDirection: 'row', gap: spacing.sm},
  button: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonDisabled: {opacity: 0.4},
  buttonLabel: {fontSize: 15, fontWeight: '500'},
  spinner: {marginTop: spacing.sm, alignSelf: 'flex-start'},
  success: {color: '#067647', marginTop: spacing.sm, fontWeight: '600'},
  warn: {color: '#b54708', marginTop: spacing.sm},
  failure: {color: '#b42318', marginTop: spacing.sm},
});
