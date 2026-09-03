const app = require('./app');
const { Client } = require('pg');
const { getConfig, runWithEnvironment } = require('./config');

function validateProductionEnvironment() {
  for (const variable of ['HYPERDRIVE', 'JWT_SECRET']) {
    if (!getConfig(variable)) throw new Error(`${variable} must be set in production`);
  }
}

export default {
  fetch(request, environment) {
    return runWithEnvironment(environment, async () => {
      validateProductionEnvironment();
      const client = new Client({ connectionString: environment.HYPERDRIVE.connectionString });
      await client.connect();
      try {
        return await runWithEnvironment({ ...environment, __DB_CLIENT: client }, () => app.fetch(request, environment));
      } finally {
        await client.end();
      }
    });
  }
};