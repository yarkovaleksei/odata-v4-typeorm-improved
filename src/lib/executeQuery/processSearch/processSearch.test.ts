import type {
  EntityMetadata,
  ObjectLiteral,
  SelectQueryBuilder,
} from 'typeorm';

import { processSearch, searchableTextColumnTypes } from './processSearch';

type ColumnMetadata = EntityMetadata['columns'][0];

describe('processSearch', () => {
  let queryBuilder: jest.Mocked<SelectQueryBuilder<ObjectLiteral>>;
  let metadata: EntityMetadata;
  let alias: string;

  beforeEach(() => {
    // SelectQueryBuilder Mock
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<ObjectLiteral>>;
    alias = 'user';
  });

  describe('Basic scenarios', () => {
    it('should add andWhere for first text column and orWhere for others', () => {
      const columns = [
        { propertyName: 'firstName', type: 'varchar' },
        { propertyName: 'lastName', type: 'varchar' },
        { propertyName: 'age', type: 'integer' }, // не текстовый
      ] as ColumnMetadata[];

      metadata = { columns } as EntityMetadata;

      processSearch(queryBuilder, metadata, 'john', alias);

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1);
      expect(queryBuilder.orWhere).toHaveBeenCalledTimes(1);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER("user"."firstName") LIKE LOWER(:search)',
        { search: '%john%' },
      );
      expect(queryBuilder.orWhere).toHaveBeenCalledWith(
        'LOWER("user"."lastName") LIKE LOWER(:search)',
        { search: '%john%' },
      );
    });

    it('should handle column.type as a function (e.g., String for SQLite)', () => {
      const columns = [
        { propertyName: 'description', type: String }, // type.name === 'String'
      ] as ColumnMetadata[];

      metadata = { columns } as EntityMetadata;

      processSearch(queryBuilder, metadata, 'test', alias);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER("user"."description") LIKE LOWER(:search)',
        { search: '%test%' },
      );
    });

    it('should do nothing if there are no text columns', () => {
      const columns = [
        { propertyName: 'id', type: 'integer' },
        { propertyName: 'age', type: 'int' },
      ] as ColumnMetadata[];

      metadata = { columns } as EntityMetadata;

      processSearch(queryBuilder, metadata, 'john', alias);

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.orWhere).not.toHaveBeenCalled();
    });

    it('should handle only one text column', () => {
      const columns = [
        { propertyName: 'name', type: 'varchar' },
      ] as ColumnMetadata[];

      metadata = { columns } as EntityMetadata;

      processSearch(queryBuilder, metadata, 'john', alias);

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1);
      expect(queryBuilder.orWhere).not.toHaveBeenCalled();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER("user"."name") LIKE LOWER(:search)',
        { search: '%john%' },
      );
    });

    it('should use the provided alias', () => {
      const columns = [
        { propertyName: 'email', type: 'varchar' },
      ] as ColumnMetadata[];

      metadata = { columns } as EntityMetadata;

      const customAlias = 'usr';

      processSearch(queryBuilder, metadata, 'test', customAlias);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER("usr"."email") LIKE LOWER(:search)',
        expect.any(Object),
      );
    });

    it('should convert search string to lowercase and wrap with %', () => {
      const columns = [
        { propertyName: 'name', type: 'varchar' },
      ] as ColumnMetadata[];

      metadata = { columns } as EntityMetadata;

      processSearch(queryBuilder, metadata, 'JoHn DoE', alias);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(expect.any(String), {
        search: '%john doe%',
      });
    });

    it('should handle an empty search string (resulting in %%)', () => {
      const columns = [
        { propertyName: 'name', type: 'varchar' },
      ] as ColumnMetadata[];

      metadata = { columns } as EntityMetadata;

      processSearch(queryBuilder, metadata, '', alias);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(expect.any(String), {
        search: '%%',
      });
    });

    it('should match text column types case‑insensitively', () => {
      const columns = [
        { propertyName: 'name', type: 'VARCHAR' }, // UPPER CASE
      ] as unknown as ColumnMetadata[];

      metadata = { columns } as EntityMetadata;

      processSearch(queryBuilder, metadata, 'test', alias);

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should ignore column types not present in "searchableTextColumnTypes"', () => {
      class CustomType {}
      const columns = [
        { propertyName: 'custom', type: CustomType }, // type.name = 'CustomType'
      ] as ColumnMetadata[];

      metadata = { columns } as EntityMetadata;

      processSearch(queryBuilder, metadata, 'test', alias);

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should not mutate the original search string', () => {
      const columns = [
        { propertyName: 'name', type: 'varchar' },
      ] as ColumnMetadata[];

      metadata = { columns } as EntityMetadata;

      const originalSearch = 'Original';

      processSearch(queryBuilder, metadata, originalSearch, alias);

      expect(originalSearch).toBe('Original');
    });
  });

  describe('Text column type detection', () => {
    // Параметризованный тест для каждого текстового типа из списка
    it.each(searchableTextColumnTypes)(
      'should include column with type "%s" as text column',
      (type) => {
        const columns = [{ propertyName: 'content', type }] as ColumnMetadata[];

        metadata = { columns } as EntityMetadata;

        processSearch(queryBuilder, metadata, 'test', alias);

        expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1);
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          expect.stringContaining(
            'LOWER("user"."content") LIKE LOWER(:search)',
          ),
          expect.objectContaining({ search: '%test%' }),
        );
      },
    );

    it.each(searchableTextColumnTypes)(
      'should handle type "%s" in uppercase',
      (type) => {
        const columns = [
          { propertyName: 'content', type: type.toUpperCase() },
        ] as ColumnMetadata[];

        metadata = { columns } as EntityMetadata;

        processSearch(queryBuilder, metadata, 'test', alias);

        expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1);
      },
    );

    it('should handle type as function (String)', () => {
      const columns = [
        { propertyName: 'content', type: String },
      ] as ColumnMetadata[];

      metadata = { columns } as EntityMetadata;

      processSearch(queryBuilder, metadata, 'test', alias);

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1);
    });

    it('should ignore column types not present in textColumnTypes', () => {
      const nonTextTypes = [
        'integer',
        'int',
        'boolean',
        'date',
        'datetime',
        'float',
        'decimal',
        'json',
      ];
      for (const type of nonTextTypes) {
        const columns = [{ propertyName: 'id', type }] as ColumnMetadata[];

        metadata = { columns } as EntityMetadata;

        const freshBuilder = {
          andWhere: jest.fn(),
          orWhere: jest.fn(),
        } as unknown as SelectQueryBuilder<ObjectLiteral>;

        processSearch(freshBuilder, metadata, 'test', alias);

        expect(freshBuilder.andWhere).not.toHaveBeenCalled();
        expect(freshBuilder.orWhere).not.toHaveBeenCalled();
      }
    });

    it('should treat custom function type as non-text unless its name matches', () => {
      class CustomType {}
      const columns = [
        { propertyName: 'custom', type: CustomType },
      ] as ColumnMetadata[];

      metadata = { columns } as EntityMetadata;

      processSearch(queryBuilder, metadata, 'test', alias);

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.orWhere).not.toHaveBeenCalled();
    });
  });
});
