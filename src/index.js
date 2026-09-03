const app = require('./app');
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
      return app.fetch(request, environment);
    });
  }
};