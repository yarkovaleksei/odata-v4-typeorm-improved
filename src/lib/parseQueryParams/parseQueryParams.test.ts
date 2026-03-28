import type { QueryParams } from '../types';

import { parseQueryParams } from './parseQueryParams';

describe('parseQueryParams', () => {
  describe('$search', () => {
    it('should keep $search as is when it is a non-empty string', () => {
      const query: QueryParams = { $search: 'hello' };
      const result = parseQueryParams(query);
      expect(result.$search).toBe('hello');
    });

    it('should trim whitespace from $search and keep if non-empty after trim', () => {
      const query: QueryParams = { $search: '  test  ' };
      const result = parseQueryParams(query);
      expect(result.$search).toBe('test');
    });

    it('should set $search to undefined when it is an empty string', () => {
      const query: QueryParams = { $search: '' };
      const result = parseQueryParams(query);
      expect(result.$search).toBeUndefined();
    });

    it('should set $search to undefined when it contains only whitespace', () => {
      const query: QueryParams = { $search: '   ' };
      const result = parseQueryParams(query);
      expect(result.$search).toBeUndefined();
    });

    it('should set $search to undefined when it is undefined', () => {
      const query: QueryParams = {};
      const result = parseQueryParams(query);
      expect(result.$search).toBeUndefined();
    });

    it('should set $search to undefined when it is null (though type says string)', () => {
      // В реальности QueryParams допускает только string, но для полноты
      const query = { $search: null as never };
      const result = parseQueryParams(query);
      expect(result.$search).toBeUndefined();
    });
  });

  describe('$top', () => {
    it('should convert string number to number', () => {
      const query: QueryParams = { $top: '10' };
      const result = parseQueryParams(query);
      expect(result.$top).toBe(10);
    });

    it('should keep number as number', () => {
      const query: QueryParams = { $top: 20 };
      const result = parseQueryParams(query);
      expect(result.$top).toBe(20);
    });

    it('should default to 0 when $top is undefined', () => {
      const query: QueryParams = {};
      const result = parseQueryParams(query);
      expect(result.$top).toBe(0);
    });

    it('should default to 0 when $top is null (though type says number | string)', () => {
      const query = { $top: null as never };
      const result = parseQueryParams(query);
      expect(result.$top).toBe(0);
    });

    it('should convert string "0" to 0', () => {
      const query: QueryParams = { $top: '0' };
      const result = parseQueryParams(query);
      expect(result.$top).toBe(0);
    });

    it('should handle negative numbers as strings', () => {
      const query: QueryParams = { $top: '-5' };
      const result = parseQueryParams(query);
      expect(result.$top).toBe(-5);
    });

    it('should handle floating point numbers as strings (parseInt truncates)', () => {
      const query: QueryParams = { $top: '3.14' };
      const result = parseQueryParams(query);
      expect(result.$top).toBe(3);
    });
  });

  describe('$skip', () => {
    it('should convert string number to number', () => {
      const query: QueryParams = { $skip: '5' };
      const result = parseQueryParams(query);
      expect(result.$skip).toBe(5);
    });

    it('should keep number as number', () => {
      const query: QueryParams = { $skip: 15 };
      const result = parseQueryParams(query);
      expect(result.$skip).toBe(15);
    });

    it('should default to 0 when $skip is undefined', () => {
      const query: QueryParams = {};
      const result = parseQueryParams(query);
      expect(result.$skip).toBe(0);
    });

    it('should default to 0 when $skip is null', () => {
      const query = { $skip: null as never };
      const result = parseQueryParams(query);
      expect(result.$skip).toBe(0);
    });
  });

  describe('$count', () => {
    it('should default to true when $count is undefined', () => {
      const query: QueryParams = {};
      const result = parseQueryParams(query);
      expect(result.$count).toBe(true);
    });

    it('should keep boolean true', () => {
      const query: QueryParams = { $count: true };
      const result = parseQueryParams(query);
      expect(result.$count).toBe(true);
    });

    it('should keep boolean false', () => {
      const query: QueryParams = { $count: false };
      const result = parseQueryParams(query);
      expect(result.$count).toBe(false);
    });

    it('should convert string "true" to true', () => {
      const query: QueryParams = { $count: 'true' };
      const result = parseQueryParams(query);
      expect(result.$count).toBe(true);
    });

    it('should convert any other string to false', () => {
      const query: QueryParams = { $count: 'false' };
      const result = parseQueryParams(query);
      expect(result.$count).toBe(false);
    });

    it('should convert string "TRUE" to false (case-sensitive)', () => {
      const query: QueryParams = { $count: 'TRUE' };
      const result = parseQueryParams(query);
      expect(result.$count).toBe(false);
    });

    it('should convert empty string to false', () => {
      const query: QueryParams = { $count: '' };
      const result = parseQueryParams(query);
      expect(result.$count).toBe(false);
    });

    it('should convert number 1 to false (not a boolean or string "true")', () => {
      const query = { $count: 1 as never };
      const result = parseQueryParams(query);
      expect(result.$count).toBe(false);
    });
  });

  describe('Other fields', () => {
    it('should copy $filter, $orderby, $select, $expand unchanged', () => {
      const query: QueryParams = {
        $filter: 'name eq "John"',
        $orderby: 'name desc',
        $select: 'id,name',
        $expand: 'profile',
      };
      const result = parseQueryParams(query);
      expect(result.$filter).toBe(query.$filter);
      expect(result.$orderby).toBe(query.$orderby);
      expect(result.$select).toBe(query.$select);
      expect(result.$expand).toBe(query.$expand);
    });

    it('should handle missing optional fields as undefined', () => {
      const query: QueryParams = {};
      const result = parseQueryParams(query);
      expect(result.$filter).toBeUndefined();
      expect(result.$orderby).toBeUndefined();
      expect(result.$select).toBeUndefined();
      expect(result.$expand).toBeUndefined();
    });
  });

  describe('Complete object structure', () => {
    it('should return a complete ParsedQueryParams object with correct types', () => {
      const query: QueryParams = {
        $search: '  test  ',
        $filter: 'age gt 18',
        $orderby: 'name',
        $select: 'name,age',
        $expand: 'posts',
        $top: '50',
        $skip: '10',
        $count: 'true',
      };
      const result = parseQueryParams(query);
      expect(result).toEqual({
        $search: 'test',
        $filter: 'age gt 18',
        $orderby: 'name',
        $select: 'name,age',
        $expand: 'posts',
        $top: 50,
        $skip: 10,
        $count: true,
      });
    });

    it('should preserve numeric values when they are already numbers', () => {
      const query: QueryParams = {
        $top: 100,
        $skip: 200,
        $count: false,
      };
      const result = parseQueryParams(query);
      expect(result.$top).toBe(100);
      expect(result.$skip).toBe(200);
      expect(result.$count).toBe(false);
    });

    it('should handle mixed types correctly', () => {
      const query: QueryParams = {
        $search: '  search  ',
        $top: 'invalid',
        $skip: '15',
        $count: 'maybe',
      };
      const result = parseQueryParams(query);
      expect(result.$search).toBe('search');
      // parseInt('invalid') => NaN, но NaN преобразуется в 0 из-за ?? 0? Нет: typeof $top === 'string' ? parseInt(...) : ($top ?? 0). Если строка не число, parseInt вернёт NaN, и это значение будет использовано (NaN). Но NaN не является falsy, поэтому оно останется. Это потенциальная проблема, но по заданию мы тестируем поведение как есть.
      expect(result.$top).toBeNaN();
      expect(result.$skip).toBe(15);
      expect(result.$count).toBe(false);
    });
  });
});
