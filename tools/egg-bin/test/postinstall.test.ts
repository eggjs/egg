import path from 'node:path';
import coffee from './coffee.js';
import { getRootDirname, getFixtures } from './helper.js';

describe('test/postinstall.test.ts', () => {
  const postInstallScript = path.join(
    getRootDirname(),
    'scripts/postinstall.mjs'
  );
  const NODE_DEBUG = '@eggjs/bin/scripts/postinstall';

  it('should work', () => {
    const cwd = getFixtures('test-postinstall');
    return (
      coffee
        .fork(postInstallScript, [], {
          cwd,
          env: {
            NODE_DEBUG,
            npm_rootpath: cwd,
          },
        })
        // .debug()
        .expect(
          'stdout',
          /\[egg-ts-helper\] create typings[/\\]config[/\\]plugin\.d\.ts/
        )
        .expect(
          'stdout',
          /\[egg-ts-helper\] create typings[/\\]app[/\\]index\.d\.ts/
        )
        .expect('code', 0)
        .end()
    );
  });

  it('should work with special path', () => {
    const cwd = getFixtures('test path with space/example-declarations');
    const tsHelper = getFixtures(
      'test path with space/example-declarations/node_modules/egg-ts-helper/dist/bin.js'
    );
    return (
      coffee
        .fork(postInstallScript, [tsHelper], {
          cwd,
          env: {
            NODE_DEBUG,
            npm_rootpath: cwd,
          },
        })
        // .debug()
        .expect('stdout', /Hi, I am Egg TS helper!/)
        .expect('code', 0)
        .end()
    );
  });
});
