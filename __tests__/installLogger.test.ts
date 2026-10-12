import {
  installRedactingLogger,
  installSdkRedactingLogger,
  resetInstalledFlagForTests,
} from '../src/logging/install';

const SECRET = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

describe('installRedactingLogger', () => {
  const originals = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  afterEach(() => {
    Object.assign(console, originals);
    resetInstalledFlagForTests();
  });

  it('redacts a secret passed through console.debug', () => {
    const spy = jest.fn();
    console.debug = spy;

    installRedactingLogger();
    console.debug('dropping password', {password: 'hunter2'});

    expect(spy).toHaveBeenCalledWith('dropping password', {
      password: '<redacted:7 chars>',
    });
  });

  it('scrubs an AppKey-shaped value out of a raw string', () => {
    const spy = jest.fn();
    console.info = spy;

    installRedactingLogger();
    console.info(`read flash deviceInfo {"applicationKey":"${SECRET}"}`);

    expect(spy.mock.calls[0][0]).not.toContain(SECRET);
    expect(spy.mock.calls[0][0]).toContain('<redacted:32-hex>');
  });

  it('does not stack wrappers when called twice', () => {
    const spy = jest.fn();
    console.warn = spy;

    installRedactingLogger();
    installRedactingLogger();
    console.warn({password: 'abc'});

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({password: '<redacted:3 chars>'});
  });

  it('leaves non-sensitive arguments readable', () => {
    const spy = jest.fn();
    console.log = spy;

    installRedactingLogger();
    console.log('read ok', {model: 'EM300-TH', battery: 87});

    expect(spy).toHaveBeenCalledWith('read ok', {
      model: 'EM300-TH',
      battery: 87,
    });
  });
});

describe('installSdkRedactingLogger', () => {
  it('routes the SDK logger hooks through redaction', () => {
    const spy = jest.fn();
    const originalInfo = console.info;
    console.info = spy;

    let injected:
      | {extend: (tag: string) => Record<string, unknown>}
      | undefined;
    installSdkRedactingLogger({
      setLogger: logger => {
        injected = logger;
      },
    });

    const tagged = injected?.extend('NFC') as {
      info: (...args: unknown[]) => void;
    };
    tagged.info('read flash deviceInfo', {applicationKey: SECRET});

    expect(spy).toHaveBeenCalledWith('[NFC]', 'read flash deviceInfo', {
      applicationKey: '<redacted:32 chars>',
    });

    console.info = originalInfo;
  });

  it('tolerates an SDK build that exposes neither hook', () => {
    expect(() => installSdkRedactingLogger({})).not.toThrow();
  });
});
