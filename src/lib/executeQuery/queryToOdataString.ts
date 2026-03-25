import type { QueryParams } from '../types';

export const queryToOdataString = (query: QueryParams): string => {
  return Object.entries(query)
    .filter(([key, value]) => key.startsWith('$') && value != null)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join('&');
};
