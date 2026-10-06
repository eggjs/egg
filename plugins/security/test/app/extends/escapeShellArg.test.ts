import { exec as childProcessExec } from 'node:child_process';
import { promisify } from 'node:util';

import { mm, type MockApplication } from '@eggjs/mock';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

import escapeShellArg from '../../../src/lib/helper/escapeShellArg.ts';
import { getFixtures } from '../../utils.ts';

const exec = promisify(childProcessExec);
const itOnPosix = process.platform === 'win32' ? it.skip : it;

describe('test/app/extends/escapeShellArg.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/helper-escapeShellArg-app'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  describe('helper.escapeShellArg()', () => {
    it('should add single quotes around a string', () => {
      return app.httpRequest().get('/escapeShellArg').expect(200).expect('true');
    });

    it('should add single quotes around a string and quotes/escapes any existing single quotes', () => {
      return app.httpRequest().get('/escapeShellArg-2').expect(200).expect('true');
    });

    it('should not affect normal arg', () => {
      return app.httpRequest().get('/escapeShellArg-3').expect(200).expect('true');
    });

    itOnPosix('should keep single quotes inside one shell argument', async () => {
      const payload = "'; echo EGG_SECURITY_INJECTED; #";
      const { stdout } = await exec(`printf 'ARG:%s\\n' ${escapeShellArg(payload)}`);

      expect(stdout).toBe("ARG:'; echo EGG_SECURITY_INJECTED; #\n");
    });
  });
});
