# Vendored dependency patches

Applied by `patch-package` from this project's `postinstall` script.

## `react-native-nfc-manager+2.1.8.patch`

Origin: shipped inside `toolbox-sdk@2.1.6` (`patches/` directory in the tarball),
normally applied by that package's own `postinstall` hook
(`npx toolbox-patch init` → `scripts/patchApply.js`).

**We do not use that hook.** It runs `git apply` for every patch the SDK ships
and swallows every failure silently (`stdio: 'ignore'`, with the error branch
commented out), so a build where the patch did _not_ apply is indistinguishable
from one where it did. It also attempts patches for libraries we do not install.
Vendoring the one patch we need and applying it with `patch-package` makes the
result reproducible and makes a mismatch a hard failure instead of a silent one.

Content is byte-identical to Milesight's patch (verified; only the git blob hash
in the header differs, because `patch-package` strips one trailing-whitespace
line). It makes four changes:

1. `setNdefPushMessage` — stubbed to a rejected promise on the JS side and
   deleted from the Android native module. Android Beam was removed in API 34;
   the original code calls a deleted API.
2. `addListener` / `removeListeners` — added as no-op `@ReactMethod`s. Required
   by RN's `NativeEventEmitter` on modern React Native; without them, attaching
   NFC event listeners warns or throws.
3. `PendingIntent.FLAG_MUTABLE` on the foreground-dispatch intent, guarded by
   `Build.VERSION.SDK_INT >= M`. **This one is load-bearing:** since Android 12
   (API 31) a `PendingIntent` must declare mutability explicitly, and the
   unpatched `PendingIntent.getActivity(..., 0)` throws at runtime. NFC
   foreground dispatch would crash on any modern handset without it.
   (`android.os.Build` is already imported in the unpatched file, so this
   compiles.)

If `react-native-nfc-manager` is ever unpinned from 2.1.8, this patch must be
re-checked — `toolbox-sdk` hard-pins that version as a peer dependency, so
unpinning is a deliberate decision, not a routine bump.

## `toolbox-sdk+2.1.6.patch`

Redacts the plaintext device password that `getSettingJSON` writes to
`console.debug` (`model/utils/migrationUtils.ts:596`, compiled to
`lib/module/model/utils/migrationUtils.js:445`). That line is reachable on our
NFC write path and fires on the **normal** write case — a password present with
`changePassword !== true`. See `docs/sdk-pre-stage1-review.md` §2 finding A.

The line is **redacted, not deleted**. It still reports that the drop-password
branch was taken and whether a password was present and how long it was:

```
will drop the password -> <redacted:6 chars>
```

Deleting it would lose a useful signal during hardware bring-up, which is
exactly when this branch matters. `babel-plugin-transform-remove-console` does
not help here — it only strips `console.*` from _release_ bundles, and bring-up
runs in debug.

Both the compiled `lib/module` output (what actually runs) and the shipped
`src` TypeScript are patched, so the leak is not still sitting there for anyone
reading the SDK source.

This patch was hand-generated rather than produced by `npx patch-package
toolbox-sdk`: `patch-package` creates patches by reinstalling a clean copy from
the registry, and `toolbox-sdk` is a local `file:` tarball that is not
published. The format is identical, and `patch-package` applies it normally —
verified by a clean reinstall.

### Second hunk set: `DevicePasswordManager` encryption key

The SDK built its device-password store with a hardcoded key:

```js
new Storage({
  id: 'dp',
  encryptionKey: '7fh4yC5XqG9SkACt2vcvY0333KbbP2lvMK7iDDCGVTE',
});
```

The same literal is in every copy of the SDK and was verified present in our own
production JS bundle. That is obfuscation, not encryption: one key break reads
the stored device passwords of every installation, not just the phone in hand.

The patch turns the eagerly-built static field into a lazily-built getter and
adds `configurePasswordStorage({encryptionKey})`. Lazy is required because a
per-install key comes from the OS keystore, which is async, while the original
ran at module load.

It **throws** when used unconfigured rather than falling back to a default. A
silent downgrade to a shared key is exactly the failure being removed, and it
would be invisible.

Three files are patched so the change holds at runtime, in the shipped source,
and in the types: `lib/module/.../DevicePasswordManager.js`,
`src/.../DevicePasswordManager.ts`, and
`lib/typescript/.../DevicePasswordManager.d.ts`.

See `src/security/` for the app side and `docs/stage5-security-review.md` for
the reasoning.
