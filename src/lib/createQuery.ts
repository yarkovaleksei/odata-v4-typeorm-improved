import { query } from 'odata-v4-parser';
import type { Token } from 'odata-v4-parser/lib/lexer';
import { SQLLang } from 'odata-v4-sql';

import { TypeOrmVisitor } from './TypeOrmVisitor';
import type { SqlOptions } from './types';

/**
 * Creates an SQL query descriptor from an OData query string
 *
 * @example
 * const filter = createQuery("$filter=Size eq 4 and Age gt 18");
 * const sqlQuery = `SELECT * FROM table WHERE ${filter.where}`;
 */
export function createQuery(odataQuery: string | Token, options: SqlOptions): TypeOrmVisitor {
  options.type = SQLLang.Oracle;

  const visitor = new TypeOrmVisitor(options);
  const ast: Token = <Token>(typeof odataQuery == 'string' ? query(odataQuery) : odataQuery);
  const visit = visitor.Visit(ast);
  const type = visit.asType();

  return type;
}
