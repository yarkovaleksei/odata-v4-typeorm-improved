import type { ObjectLiteral } from 'typeorm';

export interface ExecuteQueryOptions {
  alias?: string;
}

export interface GetManyResponse<T extends ObjectLiteral> {
  items: T[];
  count: number;
}
