const { importResolve } = require('../../../');

console.log('%o', importResolve(__dirname, {
  paths: __dirname,
}));
