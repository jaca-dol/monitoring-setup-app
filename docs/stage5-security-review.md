# Stage 5 — password and AppKey security review

The dedicated review that precedes the write path (roadmap task 12; REQ-A-03,
REQ-A-15). `CLAUDE.md` asks for this to be treated as a review rather than a
checkbox, so this document is the deliverable and the code changes follow from
it.

Two requirements are under test:

- **REQ-A-03** — the device access password set in supplier production is used
  but never exposed to the user.
- **REQ-A-15** — AppKeys are never displayed, extractable, logged, or exported.

---

## Scope: every path a secret could take

| # | Path | Verdict |
| - | ---- | ------- |
| 1 | Rendered on screen | **Closed** |
| 2 | Written to a log | **Closed** |
| 3 | Exported or shared | **Closed** |
| 4 | Held in application state | **Closed** |
| 5 | Persisted on the device | **Closed this stage** |
| 6 | Sent over NFC | **By design**, but see open item A |

### 1. Rendered on screen — closed

The only key-related UI is the Device section's AppKey row, which shows a status
pill ("Loaded in production · Verified") and never a value. The model has no
field a value could occupy: `AppKeyStatus` is `'verified' | 'missing' |
'unknown'`, derived from *which* fields the transport stripped, not from their
contents.

A test asserts that nothing 32-hex-shaped appears anywhere in the rendered tree,
for all three device types.

### 2. Written to a log — closed, and it was live

This was not hypothetical. `NfcController.readFlash()` calls
`LOGI('read flash deviceInfo', ...)` on **every successful read**, with no
`__DEV__` guard, and hardware confirmed the UC501 returns a real
`applicationKey`. Without intervention every tap would have written a live
LoRaWAN key to the device log, in release builds.

Three controls, in order of how much work they do:

1. **The redacting console wrapper** (`src/logging/`) is the one that matters.
   The SDK makes 97 direct `console.*` calls across 35 files, bypassing its own
   injectable logger, so wrapping `console` is the only thing that covers them.
   It redacts the five private-key field names plus `password`,
   `encryptionKey`, `secret` and `token`, and scrubs standalone 32-hex runs out
   of raw strings — which is what catches the error branch that logs the
   device's raw JSON as text.
2. **`patches/toolbox-sdk+2.1.6.patch`** redacts a plaintext password that
   `migrationUtils.ts` wrote straight to `console.debug`, bypassing the logger
   entirely. Redacted rather than deleted, so the branch stays observable.
3. **`babel-plugin-transform-remove-console`** strips `console.*` from release
   bundles. A backstop only — it does nothing in the debug builds that hardware
   bring-up actually runs on.

Evidence it works: the diagnostic logs shared from the device show
`"applicationKey":"<redacted:32 chars>"` on live reads.

### 3. Exported or shared — closed

`shareDiagnostics()` emits field **names** only, never values, plus the log tail
which is already redacted. This matters more than it looks: a diagnostics dump
is exactly the artefact someone emails onward.

Still to come: save-to-profile and share-settings (REQ-A-17) must strip at the
same boundary when they are built. They are currently disabled in the UI.

### 4. Held in application state — closed, with a useful accident

`stripKeyMaterial()` runs at the transport boundary and **deletes** the five key
fields plus the per-multicast `appskey`/`nwkskey` before the payload leaves
`src/transport`. It deletes rather than masking, so no placeholder can later be
mistaken for a value, and reports which fields were present so compliance stays
observable.

A verified bonus from an earlier decision: the read path calls
`NfcController.readFlash()` directly rather than `useCommService().read('nfc')`.
`readFlash` (lines 615–697) contains **no `store.dispatch`** — the dispatches
are in `writeData` and `writeFlash`. So unstripped key material never reaches
the SDK's own Redux store, which the documented entry point would have populated.
That was originally chosen because `readFlash` returns raw bytes; it turns out
to be the safer door as well.

### 5. Persisted on the device — closed this stage

**This was the outstanding finding from Stage 1, and it is now fixed.**

The SDK persisted device passwords to MMKV under a hardcoded key:

```js
new Storage({id: 'dp', encryptionKey: '7fh4yC5XqG9SkACt2vcvY0333KbbP2lvMK7iDDCGVTE'})
```

The same literal ships in every copy of the SDK, sits in plaintext in
`node_modules`, and was **verified present in our own production JS bundle**.
Anyone with an APK had it. One break read every installation's stored passwords,
not just the phone in hand.

Replaced with a key that is:

- **random**, from the platform CSPRNG (`react-native-get-random-values`);
- **per install** — 32 bytes, hex;
- **held in the OS keystore** (`react-native-keychain`), so file-level access to
  the app sandbox is not enough; an attacker must execute as the app on that
  specific device.

Together with `android:allowBackup="false"` (already set), the backup-extraction
route is closed and the class break is gone.

Deliberate choices:

- **No biometric prompt.** The key guards data the app needs on every
  authenticated NFC command; prompting an installer mid-commissioning would be
  user-hostile, and the threat model is a seized or stolen handset, not a
  malicious holder of an unlocked one. `react-native-keychain`'s
  `USE_BIOMETRIC` and `USE_FINGERPRINT` permissions are therefore stripped at
  manifest merge with `tools:node="remove"` rather than inherited for a feature
  the app does not have.
- **`WHEN_UNLOCKED_THIS_DEVICE_ONLY`**, so the key never syncs anywhere.
- **The patched `DevicePasswordManager` throws when unconfigured** rather than
  falling back. A silent downgrade to a shared key is the exact failure being
  removed, and it would be invisible.

Verified in the production bundle: the literal is **absent**, and so is the
plaintext-password debug line.

### 6. Sent over NFC — by design

Authenticated commands transmit the device password to the sensor, which is what
REQ-A-03 means by "used". Nothing in scope here; see open item A for where it
comes from.

---

## Open items

### A. Where the production password comes from (REQ-A-03) — partly answered by hardware

**Update, 2026-09-22.** The first authenticated command ran against a real
EM300-TH and **succeeded with the default password**:

```
[DevicePasswordManager] no password found for id: 045C334A5C2490 in provional
[DevicePasswordManager] use default password
[NFCController] start powerOn
[NfcCommander] sendCommand success:  powerOn
```

So on that unit there is no supplier-set password: `123456` is the live
credential. A `powerOff` and a second `powerOn` behaved the same way.

That answers the *mechanical* question — nothing needs injecting for these
devices to work — but it sharpens the *policy* one:

- REQ-A-03 says the app handles "the device access password set in supplier
  production without exposing it to the user". If production is not setting one,
  the requirement describes something that does not exist yet.
- Anyone with any Milesight-compatible NFC app can power these sensors off, or
  factory-reset them. In a barn, within a few centimetres. That is a product
  decision rather than an app bug, but it should be a decision rather than an
  oversight.

Three things to confirm with whoever owns commissioning:

1. Is `123456` intended, or has supplier production simply not been configured
   to set a password yet?
2. If a password will be set, does it arrive per device or shared — and by what
   route, given the app is offline-only (REQ-A-16)?
3. Is the iDOL53 the same? Only the EM300 has been tested; the UC501 may differ,
   and it is the article dol-sensors actually sells.

The rest of this item stands: the injection point is `setDefaultPassword()`, and
the options below still differ a lot in risk.

---

The original analysis, still relevant for whichever answer comes back.

The SDK resolves a password through
`DevicePasswordManager.getPasswordById(tagId)`, which falls back to the
hardcoded default `'123456'` when nothing is stored. Nothing in this app injects
the supplier's production password, and no source material says how it is meant
to arrive.

`setDefaultPassword()` is the injection point. The question to answer first is
what the answer should look like, because the options differ a lot in risk:

| Option | Consequence |
| ------ | ----------- |
| Devices genuinely use `123456` | Nothing to do, but REQ-A-03's "never exposed to the user" becomes near-meaningless |
| One shared production password | Must be injected at build time — which puts a real credential in the bundle, the same class break just fixed for MMKV |
| Per-device, derived from SN or DevEUI | Needs the derivation; the app can compute it per tag |
| Per-device, from a list | Needs distribution, and the app is offline-only (REQ-A-16) |

**This should be settled before the write path is built**, not after. The
password is transmitted on every authenticated command, so the wrong answer is
not a cosmetic problem.

Until it is answered, `restart`, `powerOn` and `powerOff` will send `123456`. A
`wrongPassword` failure is the expected symptom on hardware.

### B. `DevicePasswordManager` logs identifiers unconditionally

`setPasswordBy*`, `associateSnWith*`, `removePassword*` and `getDefaultPassword`
log SNs and tag UIDs outside any `__DEV__` guard. No password *values* — those
are only in `getPasswordById`, which is `__DEV__`-gated.

Left as is. Device identifiers are not secrets, they are already displayed on
the Device section, and the redacting logger covers the fields that matter.
Noted so a future reviewer does not re-derive it.

### C. `com.alibaba:fastjson:1.1.70.android`

`toolbox-sdk`'s Android module pulls in fastjson 1.1.70. The fastjson 1.x line
has a long history of deserialisation CVEs. Whether this app reaches any
vulnerable path has **not** been assessed — it is native, and out of scope for a
JS-layer review.

Worth a look before production, particularly if the codec ever parses
attacker-influenced input. For a prototype reading trusted sensors over a
centimetre of air, the exposure is low.

### D. Key material still exists in memory, briefly

Between `readFlash()` returning and `stripKeyMaterial()` running, the decoded
payload holds real keys in a JS object. It is not logged, rendered or persisted,
and is unreachable after the strip, but JS gives no way to zero it and the
garbage collector decides when it goes.

Accepted. Closing it would mean patching the SDK's own decode path, which is a
much larger change for a much smaller gain.

---

## What changed in this stage

| Change | Why |
| ------ | --- |
| `patches/toolbox-sdk+2.1.6.patch` extended | Injectable password-store key instead of the shipped literal |
| `src/security/passwordStoreKey.ts` | Per-install key, OS keystore, CSPRNG |
| `src/security/configureSdkSecurity.ts` | Hands the key to the SDK; fails loudly if the patch did not apply |
| `src/transport/nfc/commands.ts` | Configures security before any authenticated command |
| `android/app/src/main/AndroidManifest.xml` | Strips `USE_BIOMETRIC` / `USE_FINGERPRINT` |
| `react-native-keychain`, `react-native-get-random-values` | Two new native dependencies, no permissions after the strip |

## Verdict

REQ-A-15 is **met** for the read path: AppKeys are not displayed, logged,
exported, or retained.

REQ-A-03 is **partially met**. The password is never exposed to the user, and it
is now stored under a per-install key instead of a shared one. What remains is
open item A — nobody has said where the real password comes from, and the write
path should not be built until they have.
