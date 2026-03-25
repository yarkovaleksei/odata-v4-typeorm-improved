import { type SqlOptions as BaseSqlOptions } from 'odata-v4-sql/lib';

export interface SqlOptions extends BaseSqlOptions {
  alias: string;
}

export interface QueryParams {
  $search?: string;
  $filter?: string;
  $orderby?: string;
  $select?: string;
  $expand?: string;
  $top?: string | number;
  $skip?: string | number;
  $count?: string | boolean;
}

export type ParsedQueryParams = Pick<
  QueryParams,
  '$search' | '$filter' | '$orderby' | '$select' | '$expand'
> & {
  $top: number;
  $skip: number;
  $count: boolean;
};
