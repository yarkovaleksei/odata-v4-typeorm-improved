import type { EntityMetadata, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import type { QueryParams } from '../../types';

/**
 * Columns with this type available search with LIKE operator
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

const searchParamsFactory = ($search: string) => ({
  search: `%${$search.toLowerCase()}%`,
});
const searchSqlFactory = (alias: string) => (column: string) =>
  `LOWER("${alias}"."${column}") LIKE LOWER(:search)`;

export const processSearch = <T extends ObjectLiteral = ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  metadata: EntityMetadata,
  $search: Required<QueryParams>['$search'],
  alias: string
) => {
  const textColumns = metadata.columns
    // Searching with Like is only possible in text fields.
    .filter((column) => {
      const type = typeof column.type === 'function' ? column.type.name : column.type;

      return searchableTextColumnTypes.includes(type?.toLowerCase());
    })
    // Getting column names with the Text type
    .map((column) => column.propertyName);

  if (textColumns.length === 0) {
    return;
  }

  const searchParams = searchParamsFactory($search);
  const searchSql = searchSqlFactory(alias);

  textColumns.forEach((column, index) => {
    if (index === 0) {
      queryBuilder.andWhere(searchSql(column), searchParams);
    } else {
      queryBuilder.orWhere(searchSql(column), searchParams);
    }
  });
};
