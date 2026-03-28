import type { Request, Response, NextFunction } from 'express';
import type { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

import { executeQuery } from '../executeQuery';
import type { QueryParams } from '../types';

interface ODataQueryMiddlewareSettings {
  logger?: {
    error: (text: string, ...args: unknown[]) => void;
  };
  alias?: string;
}

/**
 * OData express style middleware
 */
export function ODataQueryMiddleware<T extends ObjectLiteral = ObjectLiteral>(
  repositoryOrQueryBuilder: Repository<T> | SelectQueryBuilder<T>,
  settings: ODataQueryMiddlewareSettings = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const defaultAlias = '';

    try {
      const result = await executeQuery(
        repositoryOrQueryBuilder,
        req.query as unknown as QueryParams,
        {
          alias: settings?.alias ?? defaultAlias,
        }
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
        error: { message: (e as Error).message },
      });
    }

    return next();
  };
}
