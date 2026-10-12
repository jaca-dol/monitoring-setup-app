# Stage 9 — Motion and NFC placement guidance

Three related pieces of scope, none of them in the PRD:

1. **Motion** — an animated NFC scan indicator (the iOS-style phone-to-tag loop), and motion in
   the guide generally.
2. **Where the chip is on the sensor** — a per-device illustration, as the vendor app has.
3. **Where the antenna is on the phone** — the vendor app's "current device" view.

They are grouped because they share an audience (someone holding a phone against a sensor,
unsure whether they are in the right place) and because 2 and 3 answer the same question from
opposite ends. They can land alongside Stage 8 rather than strictly after it — the scan
animation in particular belongs with the guide work.

---

## 1. Motion: how the scan animation actually works

The described animation — a phone rising and falling over a tag, a sweep of reflection, the
screen tinting blue at the top of the travel and white at the bottom — is a **loop of two cheap
properties**, not a video and not a special NFC capability. Broken down:

| What you see | How it is done |
|---|---|
| Phone rising and falling | `translateY`, looped, eased |
| Reflection sweeping across the glass | A pale diagonal band translated across a clipped parent |
| Screen tinting blue ↔ white | **Not** an animated background colour — a blue overlay whose `opacity` animates |

That last row is the one that matters, and it is worth getting right rather than discovering
later.

### Why the tint must be an overlay, not a colour animation

React Native has two animation drivers:

- **JS driver** — each frame's value is computed in JavaScript and sent across to native. It can
  animate anything, including colours. It also stops dead whenever the JS thread is busy.
- **Native driver** (`useNativeDriver: true`) — the whole animation is handed to the UI thread
  once and runs there. Immune to JS-thread work. But it only supports `transform` and `opacity`.

For a decorative animation on an idle screen, either works. **This one is not on an idle
screen.** It plays during an NFC exchange, which is exactly when our JS thread is busiest — the
SDK is running transceives, retries, and emitting progress events the whole time. On the JS
driver this animation would stutter or freeze precisely when it is meant to reassure the user
that something is happening. A frozen "scanning" animation is worse than none: it reads as a
crash.

So: native driver only → `transform` and `opacity` only → the tint is a blue `View` laid over
the phone illustration with its opacity driven by the same animated value as the travel. Same
visual result, immune to the SDK's work.

### Dependencies: none needed

`Animated` ships with React Native. The animation above is entirely `translateY` + `opacity`, so
it needs nothing new. Worth saying explicitly because the two obvious libraries are both real
costs:

- **`react-native-reanimated`** — worklets on the UI thread, can animate anything including
  colour, and is the right tool for gesture-driven interaction. It is also a large native
  dependency with its own Babel plugin, on a project that has deliberately kept its native
  surface small. Overkill for a looping decorative animation.
- **`lottie-react-native`** — renders After Effects animations exported as JSON. This is very
  likely how the vendor app's polished animations are made. It is the right answer *if a
  designer is producing the animation*, because it moves ownership out of code. It is the wrong
  answer if a developer would end up authoring the JSON by hand.

**Recommendation: build the scan animation with `Animated` and the native driver.** Revisit
Lottie only when there is a designer making assets, and then for illustration-heavy animations
rather than this one.

**Built** (2026-09-23) as `src/ui/components/NfcScanAnimation.tsx`, shown by `NfcSheet` during
the waiting phase in place of the former indeterminate bar. Plain `View`s, no new dependency,
native driver throughout, and it honours the OS reduce-motion setting by parking on a still
frame.

### Known trap, already hit once

We removed an animation from `NfcSheet` earlier in this build because `Animated`'s easing
crashed under Jest (`_bezier is not a function`). That was not a reason to avoid animation — it
is a test-environment setup gap. Before this stage adds motion, the Jest setup needs the
standard `Animated` mock so eased animations can be unit-tested rather than avoided.

Separately, the existing decision in `NfcSheet` still stands and should not be undone by this
stage: **the progress bar is not animated**, because the SDK already smooths its progress
events, and a synthetic creeping bar would make a stalled exchange look alive. A looping "hold
it here" animation is honest — it says the app is waiting. A progress bar that advances on its
own is not. Both can coexist on the same sheet as long as that distinction holds.

### Where motion helps the guide, and where it does not

Worth a rule, or it accretes: motion should mark **transitions between states** (a step
completing, a check passing or failing, a value arriving) and **ongoing waiting** (the scan
loop). It should not decorate static content. An installer on a ladder in bad light wants the
screen to be legible, not lively.

---

## 2. Where the chip is on the sensor

### The asset problem, honestly

The vendor's diagrams are in Milesight's product documentation and are their copyright — we
cannot lift them. Two legitimate routes:

- **Ask Milesight.** They have the artwork, we are a customer building an app for their devices,
  and asking a supplier for product illustrations is an ordinary request. Worth doing first
  because it is nearly free if the answer is yes.
- **Make our own.** Photograph each sensor flat against a plain background and mark the tag
  location. Cheap, and arguably *better* than a line drawing: the installer is matching what
  they see against a real object, and a photo of the actual article removes the ambiguity a
  stylised drawing introduces.

**Asking Milesight covers all three device types, including the iDOL53.** The iDOL53 is a
dol-sensors article, but the part that carries the NFC tag and gets configured by this app is
the **UC501 controller** — the DOL53 is the ammonia sensor wired into it, and is not what the
phone is held against. So the illustration an installer needs for the iDOL53 is a UC501
illustration, and Milesight has it.

Two things that follow:

- The vendor request is worth making first, because one ask covers the whole range.
- The iDOL53's entry still needs its own **wording**, even with Milesight's UC501 artwork. An
  installer looking at an iDOL53 is holding an article with two parts, and a picture of just the
  controller needs a sentence saying that is the part to tap. That copy is ours regardless of
  where the artwork comes from.

### Format

Photographs as PNG at 2×/3× with the highlight **drawn in React Native** over the image (a
positioned circle, optionally pulsing with the same `Animated` value as the scan loop), rather
than burnt into the asset. That way the highlight can animate, can respond to state, and can be
restyled without re-exporting artwork. It also avoids `react-native-svg` as a dependency.

### Architecture

This is per-device-type data, so it belongs where the other per-device-type data already lives —
alongside `CAPABILITIES` in `src/domain/device.ts`, or in the Stage 8 guide definitions that
will want to reference it. A device type gains an optional tag-location descriptor: the image,
the highlight position, and a sentence of placement text. The component that renders it is
generic and takes that descriptor.

Consequence worth noting: a device type with no asset yet must render *something* sensible
rather than a broken image — the text alone, which is what `NfcSheet` already falls back to.

---

## 3. Where the antenna is on the phone

### Android can just tell us

This is the piece with a better answer than expected. **Android 12 (API 31) added
`NfcAdapter.getNfcAntennaInfo()`**, returning an `NfcAntennaInfo` with:

- the device's width and height in millimetres,
- whether it is foldable,
- a list of `AvailableNfcAntenna`, each with an X/Y position in millimetres.

So instead of curating a database of phone models — which is what the vendor app's device list
almost certainly is, and which would need maintaining forever — we can ask the OS and **draw**
the antenna position on a proportional outline of the actual handset.

Three honest caveats:

1. **API 31+.** Our `minSdkVersion` is 24, so this needs a runtime version guard and a fallback
   for older phones. (`compileSdkVersion` is already 35, so it compiles.)
2. **OEMs have to populate it.** Many do not, and the call can return null or an empty list.
   Best-effort, never assumed.
3. **`react-native-nfc-manager@2.1.8` does not expose it** — I checked; there is no antenna
   reference in the package. It needs a small native module: one method that reads the info and
   returns it. Modest, but it does add to the native surface, and that surface is currently
   small and deliberately so.

**iOS has no equivalent and is unlikely to.** Apple does not expose antenna geometry. It matters
much less there: the antenna is at the top edge on every iPhone, and Core NFC draws its own
system sheet during a scan. A static illustration for iPhone is sufficient and honest.

### Fallback

When the API returns nothing — old Android, unpopulated OEM, iOS — fall back to the generic
guidance `NfcSheet` already gives ("on most Android phones the NFC antenna is in the upper third
of the back"), ideally with a simple diagram. That is the current behaviour, so the fallback path
is the already-working path and the API is a progressive enhancement on top.

This ordering matters: build the fallback illustration first, add the native module second. That
way the feature is useful on every handset before any native code is written, and the native
module can be dropped without losing the feature if it turns out most phones return nothing.

---

## Open questions

1. **Will Milesight give us the device artwork?** One ask covers all three, since the iDOL53's
   tag is on its UC501. Worth doing before photographing anything.
2. **Is the phone-antenna view worth a native module**, given it is best-effort and Android-only?
   My read is yes — but only after the static fallback exists, so the decision can be made with
   the cheap version already working.

**Settled: there is no designer on this project** (confirmed 2026-09-23). So the animation is
`Animated` in code, not Lottie, and any illustration we make ourselves is a photograph rather
than drawn artwork. Both are replaceable if that changes — the scan animation is one self-
contained component, and tag-location artwork is a per-device asset reference, not something
baked into the layout.

## Gate

None of this is hardware-gated in the usual sense: it can be built and evaluated on any phone.
The sensor illustrations are blocked on having the physical articles to photograph, or on
Milesight; the antenna view's native module is worth deferring until the fallback is in.
