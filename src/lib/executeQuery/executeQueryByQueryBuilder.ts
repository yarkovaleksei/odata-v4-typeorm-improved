import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import { createQuery } from '../createQuery';
import { parseQueryParams } from '../parseQueryParams';
import type { QueryParams } from '../types';
import { mapToObject } from './mapToObject';
import { processIncludes } from './processIncludes';
import { processSearch } from './processSearch';
import { queryToOdataString } from './queryToOdataString';
import type { ExecuteQueryOptions, GetManyResponse } from './types';

export const executeQueryByQueryBuilder = async <
  T extends ObjectLiteral = ObjectLiteral,
>(
  inputQueryBuilder: SelectQueryBuilder<T>,
  query: QueryParams,
  options: ExecuteQueryOptions = {},
): Promise<T[] | GetManyResponse<T>> => {
  const { $search, ...parsedQueryWithoutSearch } = parseQueryParams(query);
  const localOptions: Required<ExecuteQueryOptions> = {
    alias: '',
    ...(options ?? {}),
  };
  const alias =
    localOptions.alias ||
    (inputQueryBuilder.expressionMap.mainAlias?.name ?? '');
  const odataString = queryToOdataString(parsedQueryWithoutSearch);
  const odataQuery = createQuery(odataString, { alias });
  const metadata = inputQueryBuilder.connection.getMetadata(alias);

  let queryBuilder = inputQueryBuilder;
  let root_select: string[] = [];

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
    processSearch<T>(queryBuilder, metadata, $search, alias);
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
