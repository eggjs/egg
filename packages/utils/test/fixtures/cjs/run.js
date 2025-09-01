const { importResolve } = require('../../../src/index.ts');

console.log(
  '%o',
  importResolve(__dirname, {
    paths: __dirname,
  })
);
