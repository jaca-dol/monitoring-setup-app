import {stripKeyMaterial} from '../src/transport/nfc/stripKeys';

import {UC501_868M_PAYLOAD} from './fixtures/uc501-868m';

const SECRET_NAMES = [
  'applicationKey',
  'applicationSessionKey',
  'networkSessionKey',
  'appskey',
  'nwkskey',
];

describe('stripKeyMaterial', () => {
  it('removes every top-level key field from a real payload', () => {
    const {payload} = stripKeyMaterial(UC501_868M_PAYLOAD);

    for (const name of SECRET_NAMES) {
      expect(payload).not.toHaveProperty(name);
    }
  });

  it('reports which fields carried a value', () => {
    const {removed} = stripKeyMaterial(UC501_868M_PAYLOAD);

    expect(removed).toEqual(expect.arrayContaining(SECRET_NAMES));
  });

  it('removes key material from every multicast entry', () => {
    const {payload, removed} = stripKeyMaterial({
      multicast: [
        {enable: false, address: '11111111', appskey: 'a', nwkskey: 'b'},
        {enable: true, address: '22222222', appskey: 'c', nwkskey: 'd'},
      ],
    });

    const multicast = payload.multicast as Array<Record<string, unknown>>;
    expect(multicast[0]).not.toHaveProperty('appskey');
    expect(multicast[1]).not.toHaveProperty('nwkskey');
    // Non-secret fields survive.
    expect(multicast[1]?.address).toBe('22222222');
    expect(removed).toContain('multicast[1].appskey');
  });

  it('leaves every non-secret field untouched', () => {
    const {payload} = stripKeyMaterial(UC501_868M_PAYLOAD);

    expect(payload.model).toBe('UC501-868M');
    expect(payload.deviceEui).toBe('24e124454e281332');
    expect(payload.battery).toBe(93);
    expect(payload.rssi).toBe(-104);
  });

  it('does not mutate the input', () => {
    const input = {applicationKey: 'secret', model: 'UC501'};

    stripKeyMaterial(input);

    expect(input.applicationKey).toBe('secret');
  });

  it('deletes rather than masking, so no placeholder can be mistaken for a value', () => {
    const {payload} = stripKeyMaterial({applicationKey: 'secret'});

    expect('applicationKey' in payload).toBe(false);
  });

  it('does not report absent or empty fields as removed', () => {
    const {removed} = stripKeyMaterial({applicationKey: '', model: 'UC501'});

    expect(removed).toEqual([]);
  });

  it('tolerates a malformed multicast list', () => {
    expect(() =>
      stripKeyMaterial({multicast: [null, 'nonsense', 42]}),
    ).not.toThrow();
  });
});
