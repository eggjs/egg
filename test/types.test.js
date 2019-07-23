'use strict';

const path = require('path');
const coffee = require('coffee');

describe('test typescript types', () => {
  describe('compiler code', () => {
    it('typechecking pass', async () => {
      await coffee.fork(
        require.resolve('typescript/bin/tsc'),
        [ '-p', path.resolve(__dirname, './types/tsconfig.json') ]
      )
        .debug()
        .expect('code', 0)
        .end();
    });
  });
});
