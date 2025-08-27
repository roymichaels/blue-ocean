import { Pool } from 'pg';
import { errorLog } from '@/utils/logger';

export const pgPool = new Pool();

pgPool.on('error', (err: unknown) => {
  errorLog('Postgres pool error', err);
});
