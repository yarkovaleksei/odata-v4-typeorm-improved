import type { Request, Response, NextFunction } from 'express';
import type { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

import { executeQuery } from './executeQuery';
import type { QueryParams } from './types';

interface OdataQuerySettings {
  logger?: {
    error: (text: string, ...args: any[]) => void;
  };
}

/**
 * OData express middleware
 */
export function odataQuery<T extends ObjectLiteral = ObjectLiteral>(
  repositoryOrQueryBuilder: Repository<T> | SelectQueryBuilder<T>,
  settings: OdataQuerySettings = {},
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alias = '';

      const result = await executeQuery(
        repositoryOrQueryBuilder,
        req.query as unknown as QueryParams,
        {
          alias,
        },
      );

      return res.status(200).json(result);
    } catch (e) {
      if (settings && typeof settings.logger !== 'undefined') {
        settings.logger.error('ODATA ERROR', e);
      } else {
        console.error('ODATA ERROR', e);
      }

      res.status(500).json({
        message: 'Internal server error.',
        error: { message: e.message },
      });
    }

    return next();
  };
}
