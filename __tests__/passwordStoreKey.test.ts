import * as Keychain from 'react-native-keychain';

import {
  clearPasswordStoreKey,
  getOrCreatePasswordStoreKey,
} from '../src/security/passwordStoreKey';

/**
 * The key that replaces toolbox-sdk's hardcoded literal. What matters is that
 * it is random, per install, and stable across calls — a key that silently
 * changed would orphan every stored password, and one that was predictable
 * would be no better than the literal it replaces.
 */

const SHIPPED_LITERAL = '7fh4yC5XqG9SkACt2vcvY0333KbbP2lvMK7iDDCGVTE';

beforeEach(() => {
  (Keychain as unknown as {__reset: () => void}).__reset();
  jest.clearAllMocks();
});

describe('getOrCreatePasswordStoreKey', () => {
  it('creates a key on first run', async () => {
    const key = await getOrCreatePasswordStoreKey();

    expect(key).toHaveLength(64); // 32 bytes, hex
    expect(key).toMatch(/^[0-9a-f]+$/);
  });

  it('returns the same key on later runs', async () => {
    const first = await getOrCreatePasswordStoreKey();
    const second = await getOrCreatePasswordStoreKey();

    expect(second).toBe(first);
    expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(1);
  });

  it('is not the literal the SDK shipped', async () => {
    expect(await getOrCreatePasswordStoreKey()).not.toBe(SHIPPED_LITERAL);
  });

  it('differs between installations', async () => {
    const first = await getOrCreatePasswordStoreKey();
    await clearPasswordStoreKey();
    const second = await getOrCreatePasswordStoreKey();

    expect(second).not.toBe(first);
  });

  it('stores the key for this device only, never synced', async () => {
    await getOrCreatePasswordStoreKey();

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        accessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
      }),
    );
  });

  it('replaces a stored value too short to be a key', async () => {
    await Keychain.setGenericPassword('password-store', 'short', {
      service: 'dol-sensors.monitoring-setup.password-store',
    });

    expect(await getOrCreatePasswordStoreKey()).toHaveLength(64);
  });

  it('comfortably exceeds the SDK minimum of 16 characters', async () => {
    expect((await getOrCreatePasswordStoreKey()).length).toBeGreaterThan(16);
  });
});

describe('clearPasswordStoreKey', () => {
  it('removes the stored key', async () => {
    await getOrCreatePasswordStoreKey();
    await clearPasswordStoreKey();

    expect(Keychain.resetGenericPassword).toHaveBeenCalled();
  });
});
