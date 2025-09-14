import path from 'node:path';

import coffee from './coffee.js';
import { getRootDirname, getFixtures } from './helper.js';

describe('test/egg-bin.test.ts', () => {
  const eggBin = path.join(getRootDirname(), 'bin/run.js');
  const cwd = getFixtures('test-files');

  describe('global options', () => {
    it('should show version', () => {
      return (
        coffee
          .fork(eggBin, ['--version'], { cwd })
          // .debug()
          .expect('stdout', /\d+\.\d+\.\d+/)
          .expect('code', 0)
          .end()
      );
    });

    it('should main redirect to help', () => {
      return (
        coffee
          .fork(eggBin, [], { cwd })
          // .debug()
          .expect('stdout', /USAGE/)
          .expect('stdout', /\$ egg-bin \[COMMAND]/)
          .expect('code', 0)
          .end()
      );
    });

    it('should show help', () => {
      return (
        coffee
          .fork(eggBin, ['--help'], { cwd })
          // .debug()
          .expect('stdout', /USAGE/)
          .expect('stdout', /\$ egg-bin \[COMMAND]/)
          .expect('code', 0)
          .end()
      );
    });

    it('should show egg-bin test help', () => {
      return (
        coffee
          .fork(eggBin, ['test', '-h', '--base', cwd])
          // .debug()
          .expect('stdout', /Run the test/)
          .expect(
            'stdout',
            /--\[no-]typescript {5}\[default: true] use TypeScript to run the test/
          )
          .expect('code', 0)
          .end()
      );
    });

    it('should show help when command not exists', () => {
      return (
        coffee
          .fork(eggBin, ['not-exists'], { cwd })
          // .debug()
          .expect('stderr', /command not-exists not found/)
          .expect('code', 2)
          .end()
      );
    });
  });
});
