# toolbox-sdk 2.1.6 — pre-Stage-1 review

Answers the three checks required before Stage 1 work starts. Scope is **static
analysis of `toolbox-sdk@2.1.6`** as shipped in `sdk/toolbox-sdk-2.1.6.tgz`.
Nothing here has been confirmed against hardware or a real build — the items
marked **[verify on device]** are exactly the things Stage 1 should confirm.

Line references are to the SDK's own `src/` (it ships TypeScript source, not
just `lib/`).

---

## 1. Are BLE / WiFi / location reachable from the NFC calls?

### Runtime reachability: no

Traced from the public entry points:

| Entry point                      | Path                                                                                       | Touches BLE/WiFi/location? |
| -------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------- |
| `read('nfc')`                    | `useCommService.nfcRead` → `DeviceManager.use('nfc')` → `NfcController.readFlash()`         | No                         |
| `write(x, 'nfc')`                | `useCommService.write` → `nfcWrite` → `NfcController.write()`                               | No                         |
| `NFC.powerOn()` / `powerOff()`   | `NfcController.powerOn/powerOff` → `commander.sendCommand`                                  | No                         |
| `NFC.reset()` / `restart()`      | `NfcController.reset/restart` → `commander.sendCommand`                                     | No                         |

Every BLE branch in `useCommService.ts` is behind an explicit `mode === 'ble'`
test (`bleRead`, `bleWrite`, `bleConnect`, `bleAuth`). WiFi and location are
confined to two files, neither of which the NFC path calls:
`service/DeviceManager/WifiManager.ts` and
`service/DeviceManager/ble/NativeAdapter.ts`.

### Module-graph reachability: yes, unavoidably

`toolbox-sdk`'s root `src/index.ts` does `export * from './service/DeviceManager'`,
and `service/DeviceManager/index.ts` re-exports **both** `./ble/index` and
`./WifiManager`. So importing _anything_ from `toolbox-sdk` evaluates the BLE and
WiFi modules, which import `react-native-ble-manager`, `react-native-wifi-reborn`,
`react-native-network-info`, `react-native-android-location-enabler` and
`react-native-permissions` at module scope.

Deep-importing `toolbox-sdk/service/nfc` is **not** a supported escape hatch: the
package's `exports` map declares only `"types"` for every subpath, and only `"."`
has a `"default"` condition.

Those libraries destructure `NativeModules.X` at module scope but do not throw
when it is absent — they fail only when a method is called. So the NFC-only path
should survive without them being natively linked. **[verify on device]** — this
is a first-boot smoke test, not something static analysis can settle.

`react-native-mmkv` is the exception: it is genuinely needed on the NFC read path
(see §2) and must be linked.

### Manifest merging: driven by _our_ package.json, not by the SDK

`@react-native-community/cli-config`'s `findDependencies()` reads the **project
root's** `package.json` only (`dependencies` + `devDependencies` +
`peerDependencies`) and `loadConfig.js` calls it exactly once — autolinking is
**not recursive**. `toolbox-sdk`'s own transitive native dependencies are
therefore _not_ autolinked, and their manifests do _not_ merge, unless we list
them ourselves.

`toolbox-sdk`'s own `android/src/main/AndroidManifest.xml` declares no
permissions at all.

What each library would contribute **if we add it**:

| Library                                                                                                                  | Permissions it merges in                                                                        |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `react-native-nfc-manager`                                                                                               | `NFC` (+ `uses-feature android.hardware.nfc`, `required="false"`)                                |
| `react-native-ble-manager`                                                                                               | `BLUETOOTH`, `BLUETOOTH_ADMIN`, **`ACCESS_COARSE_LOCATION`**                                     |
| `react-native-wifi-reborn`                                                                                               | `INTERNET`, `ACCESS_WIFI_STATE`, `CHANGE_WIFI_STATE`, `ACCESS_NETWORK_STATE`, `CHANGE_NETWORK_STATE` |
| `react-native-network-info`                                                                                              | `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`                                          |
| `react-native-fs`                                                                                                        | `WRITE_EXTERNAL_STORAGE`                                                                         |
| `react-native-permissions`, `-device-info`, `-mmkv`, `-zip-archive`, `-document-picker`, `-file-viewer`, `-android-location-enabler` | none                                                                                  |

**Conclusion:** the location, WiFi and internet permissions are avoidable. They
appear only if we follow the SDK README's blanket `yarn add` list. An offline-only
installer tool (REQ-A-16) does not need them. Recommendation: add native
dependencies one at a time, starting with `react-native-nfc-manager` and
`react-native-mmkv`, and treat every added permission as a deliberate decision.

> `uses-feature ... required="false"` means the app installs on handsets with no
> NFC hardware — which is precisely why REQ-A-18's startup capability check is
> required, not optional.

---

## 2. Is password handling invoked on reads? Does anything log or persist a secret?

### Yes, password infrastructure is touched on read — but no password is sent

`NfcController.readFlash()` (`src/service/nfc/controller/NfcController.ts:615`)
sends `NfcCommandName.readFlash` with **no password argument** — the read command
itself is unauthenticated. But on success it calls
`DevicePasswordManager.associateSnWithNFCId(deviceInfo.sn, tag.id)` (line 668),
which writes an SN ↔ tag-UID record to MMKV. So a read does persist data and does
initialise the password storage, even though it neither reads nor transmits a
password.

Every _other_ command — `powerOn`, `powerOff`, `reset`, `restart`, `writeFlash`,
`syncTime`, `gpioSwitch`, the debugger and certificate commands — calls
`getDevicePassword()` and sends it. That resolves to
`DevicePasswordManager.getPasswordById(tag.id)`, which falls back to the
hardcoded default `'123456'` when nothing is stored.

**Open question for REQ-A-03:** how does the supplier's production-set password
reach `DevicePasswordManager`? `setDefaultPassword()` is the injection point. If
nothing is injected, every authenticated command is sent with `123456`.
**[verify on device]**

### Findings

**A. Plaintext password written to `console.debug`, reachable on our NFC write path.**
`src/model/utils/migrationUtils.ts:596`:

```js
console.debug('getSettingJSON', `... will drop the password -> ${settingObject['password']}`);
```

`getSettingJSON` is called at `useCommService.ts:250` (before the nfc/ble branch)
and again directly at `NfcController.ts:564`. It fires on the **normal** write
case — a password is present and `changePassword !== true`. This is a direct
REQ-A-03 / REQ-A-15 problem. Note it calls `console.debug` **directly**, not the
injectable logger, so `setLogger()` will not suppress it.

**B. Full decoded device info logged unconditionally on every read.**
`NfcController.ts:665`:

```js
LOGI('read flash deviceInfo', encodedNewDeviceInfo); // LOGI = Log.i, not gated
```

The line immediately above it _is_ wrapped in `if (__DEV__)`; this one is not.
`Log.i` is an unconditional `console.info` (see below). The error branch at line
653, `Log.e('NFC', 'is not support device info', flashInfo)`, logs the raw
unmasked device JSON, also unconditionally.

**C. `padPrivateKeys` masks absent fields, not present ones — it is not a redactor.**
`src/utils/util/privateKeys.ts:63`. It fills `applicationKey`,
`applicationSessionKey`, `networkSessionKey`, `appskey`, `nwkskey` with `*` **only
when the key is missing**; a key that is present is left untouched. The source
comment states the assumption plainly: _"templates may have it, reads will not."_

So REQ-A-15 currently rests on an untested vendor assumption that these devices
never return an AppKey on an NFC read. If any of the three does, finding B logs it
in cleartext, in release builds, on every tap. **[verify on device — highest
priority security check of Stage 1]**

The real masker, `encodePrivateKeys` (same file, line 33), overwrites values that
_are_ present. It is used only on write paths (`NfcController.ts:778`, `1094`,
`1180`), never on the read path.

**D. The logger has no gating and no redaction.**
`src/utils/logger/index.ts` is a 55-line unconditional wrapper over `console.*` —
no level filter, no `__DEV__` guard, no sanitiser. React Native does not strip
`console.*` from release bundles unless `babel-plugin-transform-remove-console` is
configured, which our scaffold currently does not do.

Mitigation available: `setLogger()` and `setLog()` are exported and let us inject
a redacting implementation. That covers findings B and D but **not** A, which
bypasses the logger.

**E. Password storage uses a hardcoded encryption key shipped in the package.**
`DevicePasswordManager.ts:38-41`:

```js
private static passwordStorage = new Storage({
  id: 'dp',
  encryptionKey: '7fh4yC5XqG9SkACt2vcvY0333KbbP2lvMK7iDDCGVTE'
});
```

The same literal key is in every copy of the SDK, in plaintext in `node_modules`.
This is obfuscation, not encryption. Persisting the production device password
under it is a decision the team should take explicitly, not inherit.

**F. `DevicePasswordManager`'s own logging is clean.** It logs ids, SNs and
outcomes — never a password value. The `getPasswordById` logging is gated on
`__DEV__`; `setPasswordBy*`, `associateSnWith*`, `removePassword*` and
`getDefaultPassword` log unconditionally, but only identifiers.

**G. (BLE only, not on our path)** `useCommService.ts:64` —
`console.log('password error, remove password', password)` logs a plaintext
password. Unreachable unless BLE is used.

### Not a security finding, but a device-safety one

**`NFC.reset()` is a factory reset, not a reboot.** `NfcController.reset()`
(line 1502) sends `NfcCommandName.reset` and then rewrites the stored password to
`'123456'`, because the device's password returns to default. The reboot command
is a separate method, `restart()` (line 1533, internal action name `NfcReboot`).

**The SDK README documents this incorrectly** — it lists `await NFC.reset()` under
"Restart". Wiring REQ-A-05's reboot button to `reset()` would factory-reset
commissioned devices in the field. Use `restart()`.

---

## 3. The `react-native-nfc-manager` patch

Now vendored at `patches/react-native-nfc-manager+2.1.8.patch` and applied by
`patch-package` from our own `postinstall`. Content verified byte-identical to
Milesight's (only the git blob hash in the header differs). See
[`patches/README.md`](../patches/README.md) for what the patch changes and why
one of the three changes is load-bearing on Android 12+.

**Why we stopped using the SDK's own hook.** `scripts/patchApply.js` runs
`git apply` for every patch the SDK ships, from the detected project root, with
`stdio: 'ignore'` and its error branch commented out:

```js
} catch (e) {
  // console.error(`✗ Failed to apply ${file}`);
}
```

Every failure is silent, and it always prints "All patches processed." A build
where the patch did not apply is indistinguishable from one where it did — and
the un-applied case crashes at runtime on Android 12+. It also attempts patches
for five libraries we do not install, and is not idempotent across reinstalls.

CI now runs `npx patch-package --error-on-fail` as an explicit step, so a
mismatch fails the build rather than passing quietly.

---

## Mitigations now in place

Added after this review, before any hardware work:

- **Redacting logger** (`src/logging/`). Wraps the global `console` — necessary
  because the SDK makes 97 direct `console.*` calls across 35 files in its
  compiled output, bypassing its own injectable logger — and exposes
  `installSdkRedactingLogger()` for the `setLogger`/`setLog` hooks. Redacts the
  five private-key field names plus `password`, `encryptionKey`, `secret` and
  `token`, and scrubs standalone 32-hex runs out of raw strings, which is what
  catches finding B's raw-JSON error branch. A 16-hex DevEUI is deliberately
  left readable — PRD B3 displays it. Installed from `index.js` via a
  side-effect module, because ES imports are hoisted and a bare call between
  imports would run too late.
- **`babel-plugin-transform-remove-console`**, production env only, with
  `error` excluded. A backstop for release builds, not a control for bring-up —
  it does nothing in the debug builds hardware testing actually runs on.
- **`patches/toolbox-sdk+2.1.6.patch`** — redacts finding A at source, since
  that call bypasses the logger entirely. Redacted rather than deleted, so the
  branch stays observable during bring-up.

Findings C, E and the `reset()`/`restart()` hazard are **not** mitigated — they
need decisions or hardware, not code.

## Recommended actions before the read path is built

1. **[verify on device]** Do EM300-TH / EM500-CO2 / UC501 return `applicationKey`
   on an NFC read? This decides whether finding C is theoretical or live.
2. ~~Inject a redacting logger and add `babel-plugin-transform-remove-console`.~~ Done.
3. ~~Finding A bypasses the logger — patch it at source.~~ Done, see above.
4. Decide explicitly whether to persist device passwords at all given finding E.
5. Establish how the production password reaches `setDefaultPassword()`.
6. Add native dependencies one at a time; treat each merged permission as a
   decision.
7. Use `restart()` for REQ-A-05's reboot. Never wire `reset()` to a UI control
   without an explicit destructive-action confirmation.

## Not resolved by this review

The DOL53 ammonia channel mapping. Nothing in the SDK addresses it — it remains
the internal dol-sensors lookup described in `CLAUDE.md`.

---

## Hardware result — finding C is CONFIRMED LIVE

First successful read against a real UC501 (the iDOL53's controller):

| | |
|---|---|
| Raw bytes | 1798 |
| Decode time | 12867 ms |
| Decoded fields | 77 |
| **`applicationKey` present** | **YES** |

The decoded field list includes `applicationKey`, `applicationSessionKey`,
`appskey`, `networkSessionKey` and `nwkskey`.

**This settles the open question in finding C.** `padPrivateKeys` only fills in
fields that are *absent*; a field the device actually returns is passed through
untouched. Milesight's source comment — "templates may have it, reads will not"
— does not hold for this device. The UC501 returns real LoRaWAN key material on
an NFC read, in clear, in the object `read()` hands back.

Consequences, all now real rather than theoretical:

1. **Finding B is live.** `NfcController.readFlash()` calls
   `LOGI('read flash deviceInfo', encodedNewDeviceInfo)` with no `__DEV__`
   guard, on every successful read. Without the redacting logger in
   `src/logging/`, every tap would write a real AppKey to the device log in a
   release build. The redaction installed earlier is doing real work, not
   hypothetical work.
2. **REQ-A-15 needs a decision before the read path is built out** (Stage 4),
   not at the Stage 5 security review. The requirement is that AppKeys are never
   "displayed, extractable, logged, or exported"; today they are present in
   application memory, in the Redux store the SDK populates, and in anything
   derived from `read()`'s return value.
3. Anything that serialises device state — save-to-profile and share-settings
   (REQ-A-17), crash reporting, diagnostics export — must strip these fields at
   the boundary. The probe screen's own share function already emits field
   *names* only, never values.

Suggested direction, to be confirmed: apply `encodePrivateKeys()` (the SDK's
real masker, which overwrites values that *are* present) immediately after
`readFlash()` returns, so cleartext key material never leaves the transport
layer — and keep the unmasked payload out of the domain model entirely. That is
a change to our own read path, not a patch to the SDK.

### Other facts established by the same read

- The flash payload is ASCII/JSON text, not packed binary — the first bytes
  decode to readable content including `UC501`, which matches the SDK's
  `parseJSONSafely(flashInfo)` handling.
- `joinStatus` is among the decoded fields, consistent with Milesight Toolbox
  reporting Join Status de-activated for the same unit.
- A full read takes ~13 s wall-clock on this device with the slow timing
  profile. That is a UX constraint for Stage 3/4: the "hold still" window is
  long, and the screen has to say so.
