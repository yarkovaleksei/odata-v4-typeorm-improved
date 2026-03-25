import {
  Brackets,
  type EntityMetadata,
  type ObjectLiteral,
  type Repository,
  type SelectQueryBuilder,
} from 'typeorm';

import { createQuery } from './createQuery';
import { parseQueryParams } from './parseQueryParams';
import type { QueryParams } from './types';
import type { TypeOrmVisitor } from './visitor';

const mapToObject = (aMap) => {
  const obj = {};

  if (aMap) {
    aMap.forEach((v, k) => {
      obj[k] = v;
    });
  }

  return obj;
};

const queryToOdataString = (query: QueryParams): string => {
  let result = '';

  for (let key in query) {
    if (key.startsWith('$')) {
      if (result !== '') {
        result += '&';
      }

      result += `${key}=${query[key]}`;
    }
  }

  return result;
};

const processIncludes = <T extends ObjectLiteral = ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  odataQuery: Partial<TypeOrmVisitor>,
  alias: string,
  parent_metadata: EntityMetadata,
): SelectQueryBuilder<T> => {
  if (odataQuery.includes && odataQuery.includes.length > 0) {
    odataQuery.includes.forEach((item) => {
      const relation_metadata = queryBuilder.connection.getMetadata(
        parent_metadata.relations.find(
          (x) => x.propertyPath === item.navigationProperty,
        ).type,
      );
      const join = item.select === '*' ? 'leftJoinAndSelect' : 'leftJoin';

      if (join === 'leftJoin') {
        // add selections of data
        // TODO: remove columns that are isSelect: false
        queryBuilder.addSelect(
          item.select
            .split(',')
            .map((x: string) => x.trim())
            .filter((x: string) => x !== ''),
        );
      }

      queryBuilder = queryBuilder[join](
        (alias ? `${alias}.` : '') + item.navigationProperty,
        item.alias,
        item.where.replace(/typeorm_query/g, item.navigationProperty),
        mapToObject(item.parameters),
      );

      if (item.orderby && item.orderby != '1') {
        const orders: string[] = item.orderby
          .split(',')
          .map((i: string) =>
            i.trim().replace(/typeorm_query/g, item.navigationProperty),
          );

        orders.forEach((orderItem) => {
          const [field, order] = orderItem.split(' ');

          queryBuilder = queryBuilder.addOrderBy(
            field,
            order as 'ASC' | 'DESC',
          );
        });
      }

      if (item.includes && item.includes.length > 0) {
        processIncludes(
          queryBuilder,
          { includes: item.includes },
          item.alias,
          relation_metadata,
        );
      }
    });
  }

  return queryBuilder;
};

const executeQueryByQueryBuilder = async <
  T extends ObjectLiteral = ObjectLiteral,
>(
  inputQueryBuilder: SelectQueryBuilder<T>,
  query: QueryParams,
  options: ExecuteQueryOptions = {},
) => {
  const { $search, ...parsedQueryWithoutSearch } = parseQueryParams(query);
  const localOptions: Required<ExecuteQueryOptions> = {
    alias: '',
    ...(options ?? {}),
  };
  const alias =
    localOptions.alias || inputQueryBuilder.expressionMap.mainAlias.name;
  const odataString = queryToOdataString(parsedQueryWithoutSearch);
  const odataQuery = createQuery(odataString, { alias });
  const metadata = inputQueryBuilder.connection.getMetadata(alias);

  let queryBuilder = inputQueryBuilder;
  let root_select = [];

  // Unlike the relations which are done via leftJoin[AndSelect](), we must explicitly add root
  // entity fields to the selection if it hasn't been narrowed down by the user.
  if (Object.keys(odataQuery).length === 0 || odataQuery.select === '*') {
    root_select = metadata.nonVirtualColumns.map(
      (x) => `${alias}.${x.propertyPath}`,
    );
  } else {
    root_select = odataQuery.select.split(',').map((x: string) => x.trim());
  }

  queryBuilder = queryBuilder.select(root_select);

  queryBuilder = queryBuilder
    .andWhere(odataQuery.where)
    .setParameters(mapToObject(odataQuery.parameters));

  queryBuilder = processIncludes<T>(queryBuilder, odataQuery, alias, metadata);

  if (odataQuery.orderby && odataQuery.orderby !== '1') {
    const orders: string[] = odataQuery.orderby
      .split(',')
      .map((i: string) => i.trim());

    orders.forEach((orderItem) => {
      const [field, order] = orderItem.split(' ');

      queryBuilder = queryBuilder.addOrderBy(field, order as 'ASC' | 'DESC');
    });
  }

  if ($search) {
    const textColumns = metadata.columns
      // Searching with Like is only possible in text fields.
      .filter((column) => column.type === String)
      // Getting column names with the Text type
      .map((column) => column.propertyName);
    const searchParams = {
      search: `%${$search.toLowerCase()}%`,
    };
    const searchSql = (column: string) =>
      `LOWER("${alias}"."${column}") LIKE :search`;

    textColumns.forEach((column, index) => {
      if (index === 0) {
        queryBuilder.andWhere(searchSql(column), searchParams);
      } else {
        queryBuilder.orWhere(searchSql(column), searchParams);
      }
    });
  }

  queryBuilder = queryBuilder.skip(parsedQueryWithoutSearch.$skip);

  if (parsedQueryWithoutSearch.$top) {
    queryBuilder = queryBuilder.take(parsedQueryWithoutSearch.$top);
  }

  if (parsedQueryWithoutSearch.$count) {
    const resultData = await queryBuilder.getManyAndCount();

    return {
      items: resultData[0],
      count: resultData[1],
    };
  }

  return queryBuilder.getMany();
};

export const executeQuery = async <T extends ObjectLiteral = ObjectLiteral>(
  repositoryOrQueryBuilder: Repository<T> | SelectQueryBuilder<T>,
  query: QueryParams,
  options: ExecuteQueryOptions = {},
) => {
  const localOptions: Required<ExecuteQueryOptions> = {
    alias: '',
    ...(options ?? {}),
  };

  const { alias } = localOptions;
  let queryBuilder: SelectQueryBuilder<T> =
    repositoryOrQueryBuilder as SelectQueryBuilder<T>;

  /**
   * If "repositoryOrQueryBuilder" is a repository, then we'll turn it into QueryBuilder
   */
  if (
    typeof (repositoryOrQueryBuilder as SelectQueryBuilder<T>).expressionMap ===
    'undefined'
  ) {
    queryBuilder = (
      repositoryOrQueryBuilder as Repository<T>
    ).createQueryBuilder(alias);
  }

  const result = await executeQueryByQueryBuilder<T>(queryBuilder, query, {
    alias,
  });

  return result;
};

export interface ExecuteQueryOptions {
  alias?: string;
}
