import * as fs from 'fs';
import { DataSource } from 'typeorm';

import { User } from '../entity/User.entity';
import { Post } from '../entity/Post.entity';

export const dataSource = new DataSource({
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  entities: [User, Post],
  logging: false,
});

export async function loadSqlFile(filePath: string) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const queryRunner = dataSource.createQueryRunner();

  try {
    const statements = sql
      .split(/;\s*\n/)
      .filter((stmt) => stmt.trim().length > 0);

    for (const statement of statements) {
      await queryRunner.query(statement);
    }
  } finally {
    await queryRunner.release();
  }
}
