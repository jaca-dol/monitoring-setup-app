import {redact, redactArgs, redactString} from '../src/logging/redact';

const REAL_32_HEX = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const DEV_EUI = '24e124445d123456';

describe('redact', () => {
  it('replaces sensitive keys but keeps the field and its length', () => {
    const out = redact({
      applicationKey: REAL_32_HEX,
      model: 'EM300-TH',
    }) as Record<string, unknown>;

    expect(out.applicationKey).toBe('<redacted:32 chars>');
    expect(out.model).toBe('EM300-TH');
  });

  it('matches sensitive key names case-insensitively', () => {
    const out = redact({AppKey: 'x', PASSWORD: 'hunter2'}) as Record<
      string,
      unknown
    >;

    expect(out.AppKey).toBe('<redacted:1 chars>');
    expect(out.PASSWORD).toBe('<redacted:7 chars>');
  });

  it('covers every private-key name the SDK defines', () => {
    const out = redact({
      applicationKey: 'a',
      applicationSessionKey: 'b',
      networkSessionKey: 'c',
      appskey: 'd',
      nwkskey: 'e',
    }) as Record<string, unknown>;

    for (const value of Object.values(out)) {
      expect(value).toBe('<redacted:1 chars>');
    }
  });

  it('recurses into nested objects and arrays', () => {
    const out = redact({
      multicast: [{appskey: REAL_32_HEX, groupId: 1}],
    }) as {multicast: Array<Record<string, unknown>>};

    expect(out.multicast[0]?.appskey).toBe('<redacted:32 chars>');
    expect(out.multicast[0]?.groupId).toBe(1);
  });

  it('scrubs 32-hex runs inside raw strings', () => {
    // The SDK's error branch logs the device's raw JSON as a string, so
    // key-name matching alone would miss it.
    const raw = `{"applicationKey":"${REAL_32_HEX}","devEui":"${DEV_EUI}"}`;

    expect(redactString(raw)).toContain('<redacted:32-hex>');
    expect(redactString(raw)).not.toContain(REAL_32_HEX);
  });

  it('leaves a DevEUI alone — it is meant to be displayed', () => {
    expect(redactString(DEV_EUI)).toBe(DEV_EUI);
  });

  it('does not mangle a longer hex blob into a false positive', () => {
    const long = 'f'.repeat(64);

    expect(redactString(long)).toBe(long);
  });

  it('survives circular structures', () => {
    const node: Record<string, unknown> = {name: 'root'};
    node.self = node;

    const out = redact(node) as Record<string, unknown>;

    expect(out.name).toBe('root');
    expect(out.self).toBe('<circular>');
  });

  it('passes primitives through untouched', () => {
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
    expect(redact(true)).toBe(true);
  });

  it('does not mutate its input', () => {
    const input = {password: 'secret'};

    redact(input);

    expect(input.password).toBe('secret');
  });

  it('redacts across a whole argument list', () => {
    const out = redactArgs(['read flash deviceInfo', {password: 'abc'}]);

    expect(out[0]).toBe('read flash deviceInfo');
    expect(out[1]).toEqual({password: '<redacted:3 chars>'});
  });

  it('redacts a non-string secret without claiming a length', () => {
    const out = redact({password: {nested: true}}) as Record<string, unknown>;

    expect(out.password).toBe('<redacted>');
  });
});
