# Android bring-up — first hardware read

Written for: a developer setting up Android tooling on this Windows machine for
the first time, to run the Stage 1 NFC probe against a real sensor.

Nothing here is Android-general — the versions are the ones **this** project
pins. Where a version is stated, it matters.

---

## What the first run is actually testing

The probe screen is not a product screen. It exists to answer three questions
that static analysis could not (`docs/sdk-pre-stage1-review.md`):

1. **Does the app boot at all?** Importing `toolbox-sdk` evaluates its BLE and
   WiFi modules, and those native modules are deliberately *not* linked. The
   analysis says that is survivable. Launching the app is the proof.
2. **Does a raw NFC read complete against real hardware?** This is Stage 1's
   gate in `docs/roadmap.md`.
3. **Does the payload contain an `applicationKey`?** The SDK's `padPrivateKeys`
   only masks fields that are *absent*, so if a device returns a real AppKey it
   is passed through in clear. The screen reports this explicitly. This is the
   REQ-A-15 question and the highest-priority security check of Stage 1.

---

## 1. Install the toolchain

### Java 17

React Native 0.77 requires **JDK 17**. Not 11, not 21.

The simplest route is to let Android Studio supply it (below) — it ships a
bundled JetBrains Runtime 17. If you would rather install it separately, use
Eclipse Temurin 17 and set `JAVA_HOME` to its folder.

### Android Studio

Install Android Studio (the current stable release is fine). It brings the SDK
manager, the platform tools (`adb`), and the bundled JDK in one step.

On first launch, choose the **Standard** setup. Then open
**Settings → Languages & Frameworks → Android SDK** and confirm these are
ticked:

**SDK Platforms tab**

- Android 15 (API 35) — the project's `compileSdkVersion`

**SDK Tools tab** (tick "Show Package Details" to pick exact versions)

- Android SDK Build-Tools **35.0.0**
- Android SDK Platform-Tools
- Android SDK Command-line Tools (latest)
- **NDK (Side by side) 27.1.12297006**
- **CMake 3.22.1**

> The NDK and CMake are not optional here. `react-native-mmkv` compiles C++
> through CMake, and `mmkv` is on the NFC read path. Skipping them produces a
> Gradle failure that does not obviously say "install the NDK".

### Environment variables

Set these for your user account (Settings → System → About → Advanced system
settings → Environment Variables), then **open a new terminal** so they take
effect:

| Variable       | Value                                                            |
| -------------- | ---------------------------------------------------------------- |
| `ANDROID_HOME` | `C:\Users\<you>\AppData\Local\Android\Sdk`                        |
| `JAVA_HOME`    | `C:\Program Files\Android\Android Studio\jbr` (the bundled JDK)   |

Add to `Path`:

- `%ANDROID_HOME%\platform-tools`
- `%JAVA_HOME%\bin`

Verify in a fresh terminal:

```powershell
java -version      # expect 17.x
adb version
```

---

## 2. Prepare the phone

1. **Settings → About phone** → tap **Build number** seven times to unlock
   Developer options.
2. **Settings → System → Developer options** → enable **USB debugging**.
3. **Settings → Connected devices → Connection preferences → NFC** → turn
   **NFC on**. The app reports `disabled` and offers a settings shortcut if you
   forget, so this is recoverable.
4. Plug the phone in over USB. Accept the "Allow USB debugging?" prompt on the
   phone — tick "Always allow from this computer".

Confirm the machine can see it:

```powershell
adb devices
```

You want one entry ending in `device`. If it says `unauthorized`, the prompt on
the phone has not been accepted yet.

---

## 3. Build and run

From the project root:

```powershell
npm install
npx react-native run-android
```

The first build downloads Gradle 8.10.2 and the Android dependencies. Expect
**10–20 minutes** and a lot of output. Later builds take well under a minute.

`run-android` starts Metro in a second window and installs the app. If Metro is
not running, start it yourself with `npm start`.

### If the build fails

| Symptom                                              | Cause                                                      |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| `No Java compiler found` / wrong Java version         | `JAVA_HOME` unset or pointing at a JDK other than 17        |
| `SDK location not found`                              | `ANDROID_HOME` unset, or create `android/local.properties` with `sdk.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk` |
| `NDK not configured` / CMake errors from `mmkv`       | NDK 27.1.12297006 or CMake 3.22.1 not installed             |
| `Failed to install` / `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | An older build with the same package ID is installed: `adb uninstall com.dolsensors.monitoringsetup.prototype` |

A clean rebuild, when you need one:

```powershell
cd android
.\gradlew clean
cd ..
npx react-native run-android
```

---

## 4. Watch the logs

In a third terminal:

```powershell
npx react-native log-android
```

Or straight from adb, filtered:

```powershell
adb logcat *:S ReactNative:V ReactNativeJS:V
```

Keep this open during the read. The SDK is chatty and its NFC errors surface
here rather than on screen.

> Logs are redacted before they are written — `src/logging/` wraps `console`
> and scrubs AppKey-shaped values and password fields. If you see
> `<redacted:32 chars>` or `<redacted:32-hex>` in the output, that is working as
> intended, not a bug. A DevEUI is deliberately left readable.

---

## 5. Run the probe

1. Launch **Monitoring Setup (WIP)** on the phone.
2. The **NFC status** section should read `ready`. If it reads `unsupported`,
   the handset has no NFC radio and cannot be used. If `disabled`, use the
   button to open Android's NFC setting.
3. Press **Read tag**.
4. Hold the phone flat against the sensor's NFC area and keep it still. On most
   Android handsets the antenna is in the **upper third of the back**, not the
   centre. Expect to hunt for the sweet spot on the first attempt — move slowly
   and give each position a couple of seconds.
5. Read the result.

### What each outcome means

| Result                                  | Meaning                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------- |
| **Read OK**, raw bytes > 0              | Stage 1's gate is met for that device type. Record the byte count.       |
| **Contains applicationKey: YES**        | Finding C is live, not theoretical. Stop and flag it — REQ-A-15 needs a real fix before the read path is built out. |
| **Contains applicationKey: no**         | The vendor's assumption holds for that device. Record it per device type; it is not proven for the others until each is tested. |
| App white-screens or crashes at launch  | The unlinked BLE/WiFi module graph is *not* survivable. Capture the logcat output — that changes the dependency plan. |
| `Failed: ...` with a tag error          | Usually antenna placement or the tag moving. Retry a few times before treating it as a real failure. |

Stage 1's gate is **at least one real iDOL53 and one real Milesight device**.
Run all three types if you have them — the device configs differ, and
`applicationKey` presence has to be checked per type.

---

## 6. What to record

For each device type tested:

- Device type and band group
- Read succeeded — yes/no, and how many attempts before a clean read
- Raw byte count
- Decoded field names
- `applicationKey` present — yes/no
- Anything unexpected in logcat

That is what turns Stage 1's gate into an answer rather than an impression, and
it is the input to the Stage 2 device-model work.

---

## Known gaps in this build

- **iOS is untested.** Nothing here has been run on iOS, and its NFC entitlement
  and `Info.plist` usage string are not yet configured.
- **New Architecture is off** (`android/gradle.properties`), deliberately —
  Milesight's own demo runs with it off on this RN version, and the pinned
  `react-native-nfc-manager@2.1.8` is a legacy bridge module.
- **`android.permission.INTERNET` is in the release manifest.** It comes from
  the React Native template and Metro needs it in debug, but REQ-A-16 says the
  app works fully offline. Worth moving to a debug-only manifest before release.
- **The MMKV password-store key is still Milesight's shared literal** — verified
  present in the production JS bundle. See `docs/sdk-pre-stage1-review.md`
  finding E. It is not touched by a read, so it does not affect this test.

---

## Appendix: diagnosing a read that never finishes

### Why the spinner could hang forever

`NfcProxy.startDetection()` calls `requestTechnology(NfcTech.NfcA)` with **no
timeout**. That promise only settles when a tag exposing the `NfcA` technology
comes into range. If the tag exposes something else — or is never seen at all —
nothing rejects, nothing logs, and the spinner runs indefinitely.

The probe screen now guards this: the SDK read times out after 20s, and there is
a **Cancel scan** button that calls `cancelTechnologyRequest()` to unblock it.

### Use "Identify tag" first

"Identify tag" does not go through the SDK. It registers for *any* tag via
`registerTagEvent()` and reports what Android actually found. That separates two
very different failures:

| Identify result                       | What it means                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| Times out, no tag                     | The phone never saw the tag. Antenna placement, or NFC off. Not an SDK problem.    |
| Tag seen, **Exposes NfcA: NO**        | The SDK's read path can never match this tag — it requests `NfcA` specifically.     |
| Tag seen, **SDK chip type: unknown**  | UID prefix is neither `04` (NXP NT3H2111) nor `1D` (FM17660K). Probably not a Milesight sensor tag. |
| Tag seen, NfcA yes, chip type known   | Transport is fine; any failure is further up, in the SDK's command layer.           |

### Reading logs without the app

`npx react-native log-android` is unreliable on recent CLI versions. Use adb
directly:

```powershell
adb logcat -c                                   # clear the backlog first
adb logcat ReactNativeJS:V ReactNative:V *:S    # then reproduce
```

Drop the filter entirely if that shows nothing — the NFC stack logs under its
own tags:

```powershell
adb logcat | Select-String -Pattern "nfc|Nfc|NFC|ReactNativeJS"
```

### Or read them in the app

The probe screen has a **Log** section that captures everything the app and the
SDK write to `console`, so no cable is needed. It is redacted first, then
buffered, so what you see on screen is safe to screenshot and share.

### `fail to connect tag`

Seen as `startDetection -> fail to connect tag` in the log, usually together
with an `UnhandledError undefined` toast.

This comes from `TagTechnologyRequest.connect()` in `react-native-nfc-manager`:
`NfcA.get(tag)` returned a handle, but `mTech.connect()` threw. It is a
**session** problem, not a protocol one — the tag was found, the app just could
not open a channel to it.

Android issues a `Tag` handle per discovery event, and that handle dies when the
tag leaves the RF field or when something else connects to it. The usual trigger
is running **Identify tag** and then **SDK read** without moving the phone: the
second scan inherits a handle that is no longer live.

Handled in `src/transport/nfc/`:

- `resetNfcSession()` returns the stack to idle — cancels any technology
  request, detaches the discovery listener, unregisters tag events, then waits
  for the native stack to settle. Both probes call it before starting.
- A `fail to connect` is retried once automatically after a reset.
- The losing side of the read timeout race has its rejection swallowed, which is
  what produced the bare `UnhandledError undefined`.

If it still fails twice: lift the phone fully away, wait a second, press **SDK
read**, and only then tap the sensor again.

### `transceive fail` after a successful connect

Different failure, further along: the tag was found *and* connected, but the
command exchange failed. A representative log:

```
09:45:01.929 [NfcProxy] detection tag {"id": "049E3FC2AD1C90", ...}
09:45:03.448 [NfcCommanderV2] checkWriteable | timeout: 1000
09:45:09.078 IPSOAction | canExecute 6750ms
09:45:09.117 [NFCController] readFlash start
09:45:09.502 [NfcCommander] checkWriteable | transceive command error: transceive fail
```

Two things to notice.

**The tag must stay in the field for ~7.6 seconds.** The SDK first probes for
IPSOv2 support, waits out a 1s timeout, then sleeps a further ~2.5s "with
progress simulation" — 6750ms before `readFlash` is even attempted. In the log
above the real read starts at 09:45:09.1 and fails 385ms later, having been
detected at 09:45:01.9. If the phone is lifted after the usual "tap" beat, the
transceive lands on a tag that is no longer there.

**`checkWriteable` needs the sensor powered.** It polls
`(response[2] & 0x21) === 0x21` — the NTAG I2C session register — waiting for
the sensor's own MCU to service the tag's SRAM. On a device that is switched
off, flat, or asleep, that bit never sets no matter how still the phone is held.

What to do, in order:

1. **Confirm the sensor is powered on** — battery fitted, switch on, not in
   deep sleep. This is the single most likely cause.
2. **Hold the phone still for a full 15 seconds** after the tag is detected.
   Do not lift when the detection line appears in the log.
3. **Turn on "Skip IPSOv2 probe"** on the probe screen. It seeds the SDK's
   per-tag support cache so `canExecute` returns immediately, cutting the ~7s
   probe and shrinking the window where the tag must stay still. Run Identify
   first — the toggle needs a tag UID.

The read result now reports **Took … ms**, so the required hold time is
measurable rather than guessed.

Timeouts are also widened at runtime (`src/transport/nfc/tuning.ts`):
`transceiveTimeout` 1200 → 3000 ms and `maxRetries` 1 → 3.

### Telling "no power" apart from "no link"

**Probe 3, Raw tag read**, settles this. It issues `GET_VERSION` (0x60) and
`READ` (0x30 0x00) straight to the NTAG chip. Both are answered by the tag
silicon on RF power alone and never involve the sensor's MCU, so they work on a
completely dead sensor.

| Raw tag read | SDK read | Conclusion |
| ------------ | -------- | ---------- |
| answers      | fails at `checkWriteable` | RF link and tag are fine. The MCU is not responding — the sensor is unpowered or asleep. |
| no answer    | fails    | The RF link itself is the problem, not power. Antenna placement, or a genuinely faulty tag. |
| answers      | succeeds | Nothing to diagnose. |

`checkWriteable` polls the NTAG I2C session register for the MCU to service the
SRAM, which is why it is the first thing to fail when the device behind the tag
is not running.

### Confirming a Milesight sensor is actually powered

Worth ruling out before chasing anything in software:

- **Is the battery tab still in?** Units frequently ship with an insulating pull
  tab, or with the cells present but not seated against the contacts.
- **Are the cells seated and the right way round?** The D-size Li-SOCl2 cells
  these devices use are easy to seat loosely.
- **Is there a power button or magnet spot?** Some models power on with a
  button, some with a magnet swipe over a marked position, some only over NFC.
  Check the specific model's quick-start guide — it differs across the range.
- **Does an LED blink** when you press the button or swipe a magnet? That is the
  quickest positive confirmation.

Note the dependency: powering a device on over NFC still requires the battery to
be connected, because the tag's field-detect pin has to wake a powered MCU. A
sensor with no battery contact cannot be woken by the app at all.

### The UC50X SRAM direction-switch quirk

`NfcIPSOAction.canExecute()` in the SDK carries this comment on its timeout
branch:

> 部分旧设备，如 EM500v1/EM300 v2/**UC50X v2/v3** 和 WS50X v1 存在 NFC 未切方向的
> 遗留问题，超时失败后需要延迟再执行后续动作

"Some older devices, such as EM500 v1 / EM300 v2 / **UC50X v2/v3** and WS50X v1,
have a legacy problem where the NFC direction has not been switched; after a
timeout failure you need to delay before running subsequent actions."

That is the NTAG I2C SRAM pass-through direction bit. A read is: the reader
writes a request into SRAM, the direction flips, the MCU writes its response
back. On the affected devices the flip is slow, so the reader polls for a
response that has not arrived. **The UC501 is a UC50X**, so this applies
directly to the iDOL53.

The signature in the log is a *successful* write followed by a read timeout:

```
[NfcCommanderV2] sendData success | dataSize 9, count 1
[NfcCommanderV2] checkReadable | timeout: 1000
[NfcReadIPSODataAction] canExecute | error: 2
```

The request went in. Nothing came back in time.

**The lever is delay, not timeout.** The SDK ships a second set of delays behind
an internal `NfcDebug` flag that is hardcoded `false` — 1500/1355/1455 ms rather
than 500/250/200. `src/transport/nfc/tuning.ts` exposes those as the **slow**
timing profile and applies them through `setConfig` at runtime.

**Do not force the legacy path on a UC50X.** Comparative testing on one powered
device showed IPSOv2 reaching `sendData success` before timing out, while the
legacy path failed immediately at `checkWriteable` with `transceive fail`.
Forcing legacy trades a late failure for an early one. The probe screen defaults
to Timing: slow, Force legacy: off.

### A blank Capability Container proves nothing

An earlier revision of this guide suggested an all-zero CC meant the host MCU
had never run. That is wrong: a UC501 confirmed working in Milesight's own
Toolbox app reports exactly the same blank CC (`00 00 00 00`) and
`NdefFormatable`. These devices do not NDEF-format their tag — they use the SRAM
pass-through channel instead. Do not read anything into it.
