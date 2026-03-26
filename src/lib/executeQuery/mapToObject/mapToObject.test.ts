import { mapToObject } from './mapToObject';

describe('mapToObject', () => {
  it('should convert a non-empty Map to an object', () => {
    const map = new Map<string, any>([
      ['key1', 'value1'],
      ['key2', 42],
      ['key3', true],
      ['key4', { nested: 'object' }],
      ['key5', [1, 2, 3]],
    ]);

    const result = mapToObject(map);

    expect(result).toEqual({
      key1: 'value1',
      key2: 42,
      key3: true,
      key4: { nested: 'object' },
      key5: [1, 2, 3],
    });
  });

  it('should return an empty object for an empty Map', () => {
    const map = new Map<string, any>();
    const result = mapToObject(map);

    expect(result).toEqual({});
  });

  it('should return an empty object for null input', () => {
    const result = mapToObject(null as any);

    expect(result).toEqual({});
  });

  it('should return an empty object for undefined input', () => {
    const result = mapToObject(undefined as any);

    expect(result).toEqual({});
  });

  it('should handle other falsy values (e.g., false) as empty object', () => {
    const result = mapToObject(false as any);

    expect(result).toEqual({});
  });

  it('should preserve all value types', () => {
    const map = new Map<string, any>([
      ['string', 'text'],
      ['number', 123],
      ['boolean', false],
      ['null', null],
      ['undefined', undefined],
      ['object', { a: 1 }],
      ['array', [1, 2]],
      ['function', () => {}],
    ]);

    const result = mapToObject(map);

    expect(result.string).toBe('text');
    expect(result.number).toBe(123);
    expect(result.boolean).toBe(false);
    expect(result.null).toBeNull();
    expect(result.undefined).toBeUndefined();
    expect(result.object).toEqual({ a: 1 });
    expect(result.array).toEqual([1, 2]);
    expect(typeof result.function).toBe('function');
  });

  it('should not mutate the original Map', () => {
    const originalMap = new Map<string, any>([['a', 1]]);
    const snapshot = new Map(originalMap);

    mapToObject(originalMap);

    expect(originalMap).toEqual(snapshot);
  });

  it('should handle a Map with many entries', () => {
    const map = new Map<string, number>();

    for (let i = 0; i < 1000; i++) {
      map.set(`key${i}`, i);
    }

    const result = mapToObject(map);

    expect(Object.keys(result).length).toBe(1000);
    expect(result.key0).toBe(0);
    expect(result.key999).toBe(999);
  });
});
