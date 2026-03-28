import type { EntityMetadata, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Brackets } from 'typeorm';
import type { QueryParams } from '../../types';

/**
 * Для столбцов этого типа доступен поиск с использованием оператора LIKE
 */
export const searchableTextColumnTypes = [
  'varchar',
  'character varying',
  'char',
  'character',
  'text',
  'citext',
  'nvarchar',
  'nchar',
  'ntext',
  'tinytext',
  'mediumtext',
  'longtext',
  // SQLite column.type is String
  'string',
];

/**
 * Числовые типы столбцов, поддерживающие поиск по принципу точного равенства
 */
export const searchableNumberColumnTypes = [
  'int',
  'int2',
  'int4',
  'int8',
  'smallint',
  'integer',
  'bigint',
  'decimal',
  'numeric',
  'float',
  'float4',
  'float8',
  'double',
  'double precision',
  'real',
  // SQLite
  'number',
] as const;

export type SearchableTextColumnType = (typeof searchableTextColumnTypes)[number];
export type SearchableNumberColumnType = (typeof searchableNumberColumnTypes)[number];

export const processSearch = <T extends ObjectLiteral = ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  metadata: EntityMetadata,
  $search: Required<QueryParams>['$search'],
  alias: string
) => {
  if (!$search || $search.trim() === '') {
    return;
  }

  const searchValue = $search.trim();

  const textColumns: string[] = [];
  const numberColumns: string[] = [];

  for (const column of metadata.columns) {
    const type = typeof column.type === 'function' ? column.type.name : column.type;
    const typeLower: SearchableTextColumnType | SearchableNumberColumnType = type?.toLowerCase();

    if (searchableTextColumnTypes.includes(typeLower as SearchableTextColumnType)) {
      textColumns.push(column.propertyName);
    } else if (searchableNumberColumnTypes.includes(typeLower as SearchableNumberColumnType)) {
      numberColumns.push(column.propertyName);
    }
  }

  const conditions: string[] = [];
  const parameters: Record<string, string | number> = {};

  // Текстовые условия
  if (textColumns.length) {
    parameters.textSearchValue = `%${searchValue.toLowerCase()}%`;

    textColumns.forEach((column) => {
      conditions.push(`LOWER("${alias}"."${column}") LIKE LOWER(:textSearchValue)`);
    });
  }

  /**
   * Числовые условия (только если $search строка, которую можно привести к числовому типу через Number)
   *
   * @example
   *
   * $search=123 // numericValue = 123
   * $search=123a // numericValue = NaN
   */
  const numericValue = Number(searchValue);

  if (!isNaN(numericValue) && numberColumns.length) {
    parameters.numberSearchValue = numericValue;

    numberColumns.forEach((column) => {
      conditions.push(`"${alias}"."${column}" = :numberSearchValue`);
    });
  }

  // Если есть хотя бы одно условие, группируем через Brackets
  if (conditions.length) {
    queryBuilder.andWhere(
      new Brackets((qb) => {
        conditions.forEach((condition, idx) => {
          if (idx === 0) {
            qb.where(condition);
          } else {
            qb.orWhere(condition);
          }
        });
      }),
      parameters
    );
  }
};
