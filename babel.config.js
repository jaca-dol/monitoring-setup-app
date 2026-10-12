module.exports = {
  presets: ['module:@react-native/babel-preset'],
  env: {
    production: {
      // Strip console.* from release bundles. toolbox-sdk logs unconditionally
      // through a thin console wrapper with no level filter and no redaction
      // (see docs/sdk-pre-stage1-review.md, finding D), so without this a
      // release build writes decoded device payloads to the device log.
      //
      // This is a backstop, NOT the primary control: it does nothing in debug
      // builds, which is exactly where hardware bring-up happens. The primary
      // controls are the redacting logger installed in src/logging and the
      // vendored patch in patches/toolbox-sdk+2.1.6.patch.
      //
      // `error` is kept so genuine failures still surface in crash logs.
      plugins: [['transform-remove-console', {exclude: ['error']}]],
    },
  },
};
