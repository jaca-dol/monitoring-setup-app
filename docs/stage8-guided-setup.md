# Stage 8 — Guided setup (step-by-step per sensor)

New scope. Like calibration, **this is not in PRD-WIRELESS-US-001-B** — the PRD describes one
screen showing everything at once (REQ-A-14), which is a reference layout for someone who
already knows what they are doing. A guided flow is a different job: getting someone through a
commissioning correctly the first time.

This document plans the **UX shape and the architecture**. It deliberately does not write the
step content — that needs field input about what installers actually get wrong, which is the
part neither of us can invent.

## The two modes, and why both stay

The existing `DeviceScreen` is an **expert view**: every section, every value, in a fixed order,
no opinion about what you should do first. It is the right tool when you are checking a sensor,
diagnosing one, or changing one setting.

A guide is a **procedure**: one decision at a time, in an order that makes sense on a ladder in
a barn, with the app confirming each step landed before moving on.

These are not competing designs and the guide should not replace the screen. The guide should
always offer a way out to the expert view, and the expert view should offer a way into the
guide. An installer who knows the job should not be forced through eight screens; one who does
not should not be handed a wall of fields.

## UX shape

### The first step cannot be device-specific

Worth stating early because it constrains everything else: **you do not know which sensor you
are holding until you have read it.** So the flow is always:

```
  Start  →  Read the sensor  →  [ guide selected by what came back ]  →  … → Done
```

Step one is identical for all three types and is already built — it is the Stage 4 read. The
per-sensor guide begins at step two, chosen by `typeId`. An unsupported tag ends the flow there
with the existing "Unsupported device" message rather than guessing.

### One step, one screen, one decision

Each step screen carries at most: where you are, what to do, the one control it needs, and one
primary action. The things that make this work on site rather than at a desk:

- **Progress that means something** — "Step 3 of 6", not a bar. An installer wants to know how
  much is left before they commit to climbing up.
- **A large primary action, always in the same place.** Phones get operated one-handed, with
  gloves, in bad light.
- **Back is always available; Skip usually is.** A guide that traps you is worse than no guide.
  Skipping should be recorded, not silently allowed — see "outcome" below.
- **Every NFC step reuses the existing `NfcSheet`.** No new transport work and no second visual
  language for the same operation.
- **Failure is a state of the step, not a dead end.** Any NFC step can fail; each one needs a
  retry that does not restart the guide.

### Steps come in a few kinds, not infinite variety

This is the observation the architecture rests on. Nearly every step is one of:

| Kind | What it does | Advance condition |
|---|---|---|
| `instruct` | Tells the installer to do something physical (mount it, open the enclosure, flip the supply on). The app cannot verify it. | User confirms |
| `read` | Runs an NFC read and refreshes the model | Read succeeds |
| `command` | Runs a device command (power on, restart) | Device acknowledges |
| `configure` | Stages a setting, then writes it | Write verified |
| `check` | Asserts something about the current model and reports pass/fail — join status, signal verdict, battery, supply present | Condition met, or explicitly overridden |
| `summary` | The end: what was done, what was skipped, what to do next | — |

Six kinds cover all three sensors. New sensors add *data*, not new screen types.

### The `check` step is the one with teeth

`check` is where a guide stops being a slideshow. "Is the signal good enough?" is a question the
app can actually answer from the model it already builds — `signalVerdict.ts` exists and returns
Good / Weak / Unusable / Disconnected.

Two things it must get right:

- **A failed check must be overridable, with the override recorded.** The installer is standing
  there and the app is not. "Signal is Weak — move the sensor or the gateway, then read again"
  with a "Continue anyway" that gets noted is honest. A hard block is not, and will be worked
  around by abandoning the guide.
- **It must not claim to verify what it cannot.** REQ-A-16 says this app is offline-only, so it
  cannot confirm the gateway received anything. It can report what the *sensor* says about its
  own join state and signal. The wording has to stay on the right side of that line —
  "the sensor reports it has joined" rather than "connected successfully".

### Interruption is the normal case

NFC sessions fail, phones lock, installers get called away. Guide state should survive
navigating away and coming back, and the app should be able to say "you were on step 4 of the
EM300 you read a minute ago — continue or start over?". This does not need persistence to disk
in a prototype; in-memory across the session is enough to start, and the state shape should not
make disk persistence hard later.

## Architecture

### A guide is data, interpreted by one runner

The thing to avoid is three hand-written wizards that drift apart. Instead:

```
  domain/guide.ts        Step types, GuideDefinition type.       Pure. No React.
  domain/guides/*.ts     One definition per device type.         Pure data.
  codec/guideRunner.ts   Reducer: (state, event) -> state.       Pure. Testable.
  ui/guide/GuideHost.tsx Renders the current step, owns NFC.     The only impure part.
  ui/guide/steps/*.tsx   One component per step KIND (six).      Presentational.
```

Adding a fourth sensor is then a new file in `domain/guides/` and nothing else. Changing the
EM300's order is editing a list. Neither touches the runner or the step components.

This also keeps the existing layering rule intact — `ui → codec/domain → transport` — with the
guide definitions sitting in `domain` beside `CAPABILITIES`, which they will want to read from
anyway (a guide should not offer a calibration step on a device with no measurement channels).

### The runner is a pure reducer

The progression logic — which step is next, whether a check passed, what a skip records — is a
pure function over (guide definition, current model, events). That makes the interesting part
unit-testable with no hardware and no rendering, which is the same bet that has paid off for the
codec layer. `GuideHost` stays thin: run NFC, feed results in, render what comes out.

Steps declare their advance condition as a **predicate over the `DeviceScreenModel`** we already
build. No new device data, no parallel model — the guide reads the same model the expert screen
renders.

### Navigation: a step cursor, not a nav library

The app currently has no navigation — `src/App.tsx` switches three screens with a `useState`
tab. A guide is the first feature that needs more.

**Recommendation: do not add `react-navigation` for this.** A guide is a linear cursor with
back/skip, which is exactly what the reducer already holds. A general navigation stack is a
poorer fit (it models arbitrary push/pop, not a bounded procedure), and it is a large dependency
with its own native setup on a project that has deliberately kept its native surface small. Add
it when there is real multi-screen navigation to justify it, not for a wizard that is one index
into an array.

What is worth doing at the same time: the three-tab `App.tsx` is scaffolding, not a shipping
shell. Whenever the guide lands, that is the moment to decide what the app's actual entry point
is — most likely "Set up a sensor" (guide) and "Read a sensor" (expert), with Probe and Preview
dropped from release builds.

### Where per-sensor difference actually lives

The three guides will differ more than the screen does, which is the point — the screen adapts
by hiding rows, a guide adapts by having genuinely different work in it:

- **iDOL53** — the most to say and the least to verify. Two physical parts (DOL53 + UC501), a
  24 V supply to confirm, an active input configuration, and **no measurement value the app can
  read back** while the ammonia channel stays unresolved (`CLAUDE.md`). Its guide will lean on
  `instruct` and installer confirmation where the others use `check`. It is also the guide most
  worth having, for the same reason.
- **EM500-CO2-T-H** — four channels, and the one where CO2 has settling behaviour worth telling
  someone about rather than letting them think the sensor is broken.
- **EM300-TH** — the simplest; close to the generic path.

Common to all: read, region if applicable, power on, signal check, summary.

## What this stage does *not* need

Worth saying, because it keeps the stage small: no new transport code, no new device model, no
new NFC work, no protocol work. Everything the guide does, the app can already do. This is
sequencing, wording, and a reducer over existing pieces.

## Open questions

1. **Who writes the step content?** The structure is mine to design; what an installer should
   actually be told — mounting height, orientation, what "good placement" means for an ammonia
   sensor in a barn — is not. This needs Martin or whoever has done the installs. Without it the
   guide is a nicely-architected set of empty screens.
2. **Is the guide the default entry point, or an option?** This decides whether the expert
   screen or the guide is what the app opens on, and it is a product decision about who the
   primary user is.
3. **Does a completed setup need to produce a record?** A summary the installer keeps, or shares
   (REQ-A-17 already covers share-settings), or that notes which checks were overridden. If yes,
   the runner should accumulate that from the start rather than have it bolted on.
4. **What happens to a failed check in practice** — is "Continue anyway" acceptable on every
   check, or is there one (signal? join state?) where the right answer is genuinely "do not
   leave this sensor here"?
5. **Does the guide need to cover replacing an existing sensor**, not just commissioning a new
   one? Different flow, and worth knowing before the step types are fixed.

## Gate

Not started, and it should not start ahead of the write path being proven on hardware — the
`configure` step kind is a write, and a guide is the worst place to discover a write bug because
it is the context where the user is most trusting the app to have got it right.

Step content (open question 1) blocks a *useful* guide but not the architecture: the runner,
step kinds and one real guide definition can be built and tested against placeholder copy, then
filled in.
