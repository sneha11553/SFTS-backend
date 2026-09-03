const { Pool } = require('pg');
require('dotenv').config();
const { getConfig } = require('./config');

const pools = new WeakMap();

function getPool() {
  const environment = getConfig('HYPERDRIVE') ? getConfig('HYPERDRIVE') : null;
  if (environment && pools.has(environment)) return pools.get(environment);

  const pool = new Pool({
    connectionString: environment?.connectionString || getConfig('DATABASE_URL'),
    max: 5,
    ssl: getConfig('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : false
  });
  if (environment) pools.set(environment, pool);
  return pool;
}

module.exports = new Proxy({}, {
  get: (_, property) => getPool()[property].bind(getPool())
});
