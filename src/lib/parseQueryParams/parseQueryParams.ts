import type { ParsedQueryParams, QueryParams } from '../types';

export const parseQueryParams = (query: QueryParams): ParsedQueryParams => {
  let { $search, $top, $skip, $count, ...queryWithoutSearch } = query;

  $search =
    typeof $search === 'string' && $search.trim().length > 0
      ? $search.trim()
      : undefined;
  $top = typeof $top === 'string' ? parseInt($top, 10) : ($top ?? 0);
  $skip = typeof $skip === 'string' ? parseInt($skip, 10) : ($skip ?? 0);
  $count =
    typeof $count === 'undefined'
      ? true
      : typeof $count === 'boolean'
        ? $count
        : $count === 'true';

  const parsedQuery: ParsedQueryParams = {
    ...queryWithoutSearch,
    $search,
    $top,
    $skip,
    $count,
  };

  return parsedQuery;
};
