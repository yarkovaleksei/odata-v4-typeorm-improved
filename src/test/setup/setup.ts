import * as path from 'path';

import { dataSource, loadSqlFile } from './dataSource';

beforeAll(async () => {
  await dataSource.initialize();
});

afterAll(async () => {
  await dataSource.destroy();
});

beforeEach(async () => {
  await dataSource.synchronize(true);

  const filePath = path.join(__dirname, 'seed.sql');

  await loadSqlFile(filePath);
});
