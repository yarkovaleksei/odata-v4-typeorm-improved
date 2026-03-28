import { mapToObject } from './mapToObject';

describe('mapToObject', () => {
  it('должен вернуть пустой объект для null или undefined', () => {
    expect(mapToObject(null)).toEqual({});
    expect(mapToObject(undefined)).toEqual({});
  });

  it('должен вернуть пустой объект для пустого Map', () => {
    const map = new Map();

    expect(mapToObject(map)).toEqual({});
  });

  it('должен корректно преобразовать Map в объект', () => {
    const map = new Map<string, string | number | boolean>([
      ['a', 1],
      ['b', 'test'],
      ['c', true],
    ]);

    expect(mapToObject(map)).toEqual({ a: 1, b: 'test', c: true });
  });

  it('должен обрабатывать ключи разных типов', () => {
    const map = new Map();

    const symbol = Symbol('sym');

    map.set('string', 1);
    map.set(123, 'number key');
    map.set(symbol, 'symbol key');

    const result = mapToObject(map);

    expect(result).toEqual({
      string: 1,
      123: 'number key',
      [symbol]: 'symbol key',
    });
  });

  describe('глубокое преобразование (deep = true)', () => {
    it('должен рекурсивно преобразовывать вложенные Map', () => {
      const innerMap = new Map([['x', 10]]);
      const outerMap = new Map([['outer', innerMap]]);

      const result = mapToObject(outerMap, true);

      expect(result).toEqual({ outer: { x: 10 } });
    });

    it('не должен преобразовывать вложенные Map, если deep = false (по умолчанию)', () => {
      const innerMap = new Map([['x', 10]]);
      const outerMap = new Map([['outer', innerMap]]);

      const result = mapToObject(outerMap);

      expect(result).toEqual({ outer: innerMap }); // innerMap остаётся Map
    });

    it('должен корректно обрабатывать смешанные вложенные структуры', () => {
      const inner = new Map([['a', 1]]);
      const map = new Map<string, Map<string, number> | number>([
        ['level1', inner],
        ['primitive', 42],
      ]);

      const result = mapToObject(map, true);

      expect(result).toEqual({ level1: { a: 1 }, primitive: 42 });
    });
  });
});
