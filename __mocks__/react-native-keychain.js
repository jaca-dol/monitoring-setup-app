/**
 * Jest stub for the OS keystore.
 *
 * Backed by a plain object so tests can exercise the get-or-create path
 * without a device. The real module talks to Android Keystore / iOS Keychain,
 * which has nothing testable off-device.
 */
const store = new Map();

module.exports = {
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
  getGenericPassword: jest.fn(async ({service}) => {
    const entry = store.get(service);
    return entry === undefined ? false : entry;
  }),
  setGenericPassword: jest.fn(async (username, password, {service}) => {
    store.set(service, {username, password, service});
    return true;
  }),
  resetGenericPassword: jest.fn(async ({service}) => {
    store.delete(service);
    return true;
  }),
  __reset: () => store.clear(),
};
