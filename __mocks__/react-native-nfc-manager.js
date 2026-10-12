/**
 * Jest stub for the NFC native module.
 *
 * The real package is an ESM native bridge with no behaviour worth asserting
 * off-device — hardware is what validates it (docs/roadmap.md Stage 1). This
 * keeps the render smoke test honest: it proves the screen mounts and the
 * capability check runs, not that NFC works.
 *
 * Root-level __mocks__ adjacent to node_modules is picked up automatically for
 * node modules, so no explicit jest.mock() call is needed.
 */
const NfcManager = {
  isSupported: jest.fn().mockResolvedValue(true),
  isEnabled: jest.fn().mockResolvedValue(true),
  start: jest.fn().mockResolvedValue(undefined),
  goToNfcSetting: jest.fn().mockResolvedValue(undefined),
  registerTagEvent: jest.fn().mockResolvedValue(undefined),
  unregisterTagEvent: jest.fn().mockResolvedValue(undefined),
  setEventListener: jest.fn(),
  cancelTechnologyRequest: jest.fn().mockResolvedValue(undefined),
};

module.exports = NfcManager;
module.exports.default = NfcManager;
module.exports.NfcEvents = {DiscoverTag: 'DiscoverTag'};
module.exports.NfcTech = {};
