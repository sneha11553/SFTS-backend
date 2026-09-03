const { Client, Pool } = require('pg');
require('dotenv').config();
const { getConfig } = require('./config');

let localPool;

function getPool() {
  const workerClient = getConfig('__DB_CLIENT');
  if (workerClient) return workerClient;

  if (localPool) return localPool;

  localPool = new Pool({
    connectionString: getConfig('DATABASE_URL'),
    ssl: getConfig('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : false
  });
  return localPool;
}

module.exports = new Proxy({}, {
  get: (_, property) => {
    const pool = getPool();
    if (property === 'connect' && pool instanceof Client) {
      return async () => ({
        query: pool.query.bind(pool),
        release: () => {}
      });
    }
    return pool[property].bind(pool);
  }
});
