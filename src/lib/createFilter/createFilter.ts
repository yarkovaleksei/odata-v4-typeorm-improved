import { filter } from 'odata-v4-parser';
import type { Token } from 'odata-v4-parser/lib/lexer';
import { SQLLang } from 'odata-v4-sql';

import { TypeOrmVisitor } from '../TypeOrmVisitor';
import type { SqlOptions } from '../types';

/**
 * Creates an SQL WHERE clause from an OData filter expression string
 *
 * @example
 * const filter = createFilter("Size eq 4 and Age gt 18");
 * const sqlQuery = `SELECT * FROM table WHERE ${filter}`;
 */
export function createFilter(odataFilter: string | Token, options: SqlOptions): TypeOrmVisitor {
  options.type = SQLLang.Oracle;

  const visitor = new TypeOrmVisitor(options);
  const ast: Token = <Token>(typeof odataFilter == 'string' ? filter(odataFilter) : odataFilter);
  const visit = visitor.Visit(ast);
  const type = visit.asType();

  return type;
}
