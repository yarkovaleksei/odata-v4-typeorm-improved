import type {
  EntityMetadata,
  ObjectLiteral,
  SelectQueryBuilder,
} from 'typeorm';

import type { QueryParams } from '../types';

/**
 * Columns with this type available search with LIKE operator
 */
const textColumnTypes = [
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

export const processSearch = <T extends ObjectLiteral = ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  metadata: EntityMetadata,
  $search: Required<QueryParams>['$search'],
  alias: string,
) => {
  const textColumns = metadata.columns
    // Searching with Like is only possible in text fields.
    .filter((column) => {
      const type =
        typeof column.type === 'function' ? column.type.name : column.type;

      return textColumnTypes.includes(type?.toLowerCase());
    })
    // Getting column names with the Text type
    .map((column) => column.propertyName);
  const searchParams = {
    search: `%${$search.toLowerCase()}%`,
  };
  const searchSql = (column: string) =>
    `LOWER("${alias}"."${column}") LIKE LOWER(:search)`;

  textColumns.forEach((column, index) => {
    if (index === 0) {
      queryBuilder.andWhere(searchSql(column), searchParams);
    } else {
      queryBuilder.orWhere(searchSql(column), searchParams);
    }
  });
};
