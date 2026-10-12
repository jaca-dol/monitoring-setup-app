import {getOrCreatePasswordStoreKey} from './passwordStoreKey';

/**
 * Hands the SDK this installation's password-store key.
 *
 * Must run before anything touches a device password — which in practice means
 * before any authenticated NFC command, since `getDevicePassword()` reads the
 * store. The patched `DevicePasswordManager` throws rather than falling back to
 * a default, so a missing call fails loudly instead of silently reinstating a
 * shared key.
 *
 * Reading is unaffected: `readFlash` sends no password.
 */

export type SecurityStatus =
  | {state: 'ready'}
  | {state: 'unavailable'; message: string};

let status: SecurityStatus | null = null;

interface PasswordManagerHost {
  DevicePasswordManager?: {
    configurePasswordStorage?: (options: {encryptionKey: string}) => void;
  };
}

/**
 * Imported from the compiled subpath because the SDK's root barrel does not
 * re-export the password service. Metro resolves it because
 * `unstable_enablePackageExports` is false.
 */
function loadPasswordManager(): PasswordManagerHost['DevicePasswordManager'] {
  const mod =
    require('toolbox-sdk/lib/module/service/password/DevicePasswordManager.js') as PasswordManagerHost;
  return mod.DevicePasswordManager;
}

export async function configureSdkSecurity(): Promise<SecurityStatus> {
  if (status !== null) {
    return status;
  }

  try {
    const key = await getOrCreatePasswordStoreKey();
    const manager = loadPasswordManager();

    if (typeof manager?.configurePasswordStorage !== 'function') {
      throw new Error(
        'toolbox-sdk is missing configurePasswordStorage — the vendored patch in patches/toolbox-sdk+2.1.6.patch did not apply.',
      );
    }

    manager.configurePasswordStorage({encryptionKey: key});
    status = {state: 'ready'};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Never log the key itself; the redacting logger would mask it anyway, but
    // it has no business being in an error path at all.
    console.warn('[security] password store not configured:', message);
    status = {state: 'unavailable', message};
  }

  return status;
}

/** Current status without triggering configuration. */
export function securityStatus(): SecurityStatus | null {
  return status;
}

/** Test seam. */
export function resetSecurityStatusForTests(): void {
  status = null;
}
