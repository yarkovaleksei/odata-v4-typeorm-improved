import type { ParsedQueryParams, QueryParams } from '../../../types';

function booleanByString(value?: 'true' | 'false' | string | boolean) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'undefined') {
    return false;
  }

  let localValue = value;

  if (typeof value !== 'string') {
    localValue = String(localValue);
  }

  switch (localValue.toLowerCase()) {
    case 'true':
      return true;
    case 'false':
    default:
      return false;
  }
}

function toNumber(value?: string | number): number {
  if (typeof value === 'string' && value.trim().length > 0) {
    const $top = parseInt(value, 10);

    if (!isNaN($top)) {
      return $top;
    }

    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  return 0;
}

export const parseQueryParams = (query: ParsedQueryParams | QueryParams): ParsedQueryParams => {
  const parsedQuery = { ...query } as unknown as ParsedQueryParams;

  parsedQuery.$search =
    typeof query.$search === 'string' && query.$search.trim().length > 0
      ? query.$search.trim()
      : undefined;

  if (typeof query.$top === 'string' && query.$top.trim().length > 0) {
    const $top = parseInt(query.$top, 10);

    if (!isNaN($top)) {
      parsedQuery.$top = $top;
    } else {
      parsedQuery.$top = 0;
    }
  } else if (typeof query.$top === 'number') {
    parsedQuery.$top = query.$top;
  } else {
    parsedQuery.$top = 0;
  }

  parsedQuery.$top = toNumber(query.$top);
  parsedQuery.$skip = toNumber(query.$skip);
  parsedQuery.$count = typeof query.$count === 'undefined' ? true : booleanByString(query.$count);

  return parsedQuery;
};
