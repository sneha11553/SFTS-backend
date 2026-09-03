const { AsyncLocalStorage } = require('node:async_hooks');

const environmentStorage = new AsyncLocalStorage();

function getEnvironment() {
  return environmentStorage.getStore() || process.env;
}

function getConfig(name) {
  return getEnvironment()[name];
}

function runWithEnvironment(environment, callback) {
  return environmentStorage.run(environment, callback);
}

module.exports = { getConfig, runWithEnvironment };