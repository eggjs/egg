const path = require('node:path');
const coffee = require('coffee');

describe('test/index.test.js', () => {
  const cli = path.join(__dirname, '../bin/create-egg.js');

  it('should call egg-init', () => {
    return (
      coffee
        .fork(cli, ['--help'])
        // .debug()
        .expect('stdout', /init egg project from boilerplate/)
        .expect('code', 0)
        .end()
    );
  });
});
