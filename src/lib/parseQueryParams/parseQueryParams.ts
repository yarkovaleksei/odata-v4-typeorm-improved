import type { ParsedQueryParams, QueryParams } from '../types';

export const parseQueryParams = (query: QueryParams): ParsedQueryParams => {
  query.$search =
    typeof query.$search === 'string' && query.$search.trim().length > 0
      ? query.$search.trim()
      : undefined;
  query.$top = typeof query.$top === 'string' ? parseInt(query.$top, 10) : (query.$top ?? 0);
  query.$skip = typeof query.$skip === 'string' ? parseInt(query.$skip, 10) : (query.$skip ?? 0);
  query.$count =
    typeof query.$count === 'undefined'
      ? true
      : typeof query.$count === 'boolean'
        ? query.$count
        : query.$count === 'true';

  return query as ParsedQueryParams;
};
