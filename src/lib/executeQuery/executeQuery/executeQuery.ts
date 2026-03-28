import type { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

import type { QueryParams } from '../../types';
import { executeQueryByQueryBuilder } from '../executeQueryByQueryBuilder';
import type { ExecuteQueryOptions } from '../types';

export const executeQuery = async <T extends ObjectLiteral = ObjectLiteral>(
  repositoryOrQueryBuilder: Repository<T> | SelectQueryBuilder<T>,
  query: QueryParams,
  options: ExecuteQueryOptions = {}
) => {
  const localOptions: Required<ExecuteQueryOptions> = {
    alias: '',
    ...(options ?? {}),
  };

  const { alias } = localOptions;
  let queryBuilder: SelectQueryBuilder<T> = repositoryOrQueryBuilder as SelectQueryBuilder<T>;

  /**
   * If "repositoryOrQueryBuilder" is a repository, then we'll turn it into QueryBuilder
   */
  if (typeof (repositoryOrQueryBuilder as SelectQueryBuilder<T>).expressionMap === 'undefined') {
    queryBuilder = (repositoryOrQueryBuilder as Repository<T>).createQueryBuilder(alias);
  }

  const result = await executeQueryByQueryBuilder<T>(queryBuilder, query, {
    alias,
  });

  return result;
};
