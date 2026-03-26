import type { QueryParams } from '../../types';

const e = (s: string) => encodeURI(s);

export const queryToOdataString = (query: QueryParams): string => {
  return Object.entries(query)
    .filter(([key, value]) => key.startsWith('$') && value != null)
    .map(([key, value]) => `$${e(key.slice(1))}=${e(value)}`)
    .join('&');
};
