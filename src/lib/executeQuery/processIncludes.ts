import type { EntityMetadata, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import type { TypeOrmVisitor } from '../TypeOrmVisitor';
import { mapToObject } from './mapToObject';

export const processIncludes = <T extends ObjectLiteral = ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  odataQuery: Partial<TypeOrmVisitor>,
  alias: string,
  parent_metadata: EntityMetadata
): SelectQueryBuilder<T> => {
  if (odataQuery.includes && odataQuery.includes.length > 0) {
    odataQuery.includes.forEach((item) => {
      const join = item.select === '*' ? 'leftJoinAndSelect' : 'leftJoin';

      if (join === 'leftJoin') {
        // add selections of data
        // TODO: remove columns that are isSelect: false
        queryBuilder.addSelect(
          item.select
            .split(',')
            .map((x: string) => x.trim())
            .filter((x: string) => x !== '')
        );
      }

      queryBuilder = queryBuilder[join](
        (alias ? `${alias}.` : '') + item.navigationProperty,
        item.alias,
        item.where.replace(/typeorm_query/g, item.navigationProperty),
        mapToObject(item.parameters)
      );

      if (item.orderby && item.orderby != '1') {
        const orders: string[] = item.orderby
          .split(',')
          .map((i: string) => i.trim().replace(/typeorm_query/g, item.navigationProperty));

        orders.forEach((orderItem) => {
          const [field, order] = orderItem.split(' ');

          queryBuilder = queryBuilder.addOrderBy(field, order as 'ASC' | 'DESC');
        });
      }

      if (item.includes && item.includes.length > 0) {
        const target = parent_metadata.relations.find(
          (x) => x.propertyPath === item.navigationProperty
        );

        if (target) {
          const relation_metadata = queryBuilder.connection.getMetadata(target.type);

          processIncludes(queryBuilder, { includes: item.includes }, item.alias, relation_metadata);
        }
      }
    });
  }

  return queryBuilder;
};
