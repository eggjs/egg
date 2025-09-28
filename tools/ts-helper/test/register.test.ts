import del from 'del';
import fs from 'node:fs';
import { getStd, fork, spawn } from './utils';
import path from 'node:path';
import { TsHelper, Register } from '../dist';
import assert from 'node:assert';
import extend from 'extend2';

const options = {
  silent: true,
  env: {
    ...process.env,
    ETS_SILENT: 'false',
    ETS_WATCH: 'true',
  },
  cwd: path.resolve(__dirname, './fixtures/app8'),
};

const runRegister = (opt?: PlainObject) => {
  return fork(path.resolve(__dirname, '../register.js'), [], extend(true, {}, options, opt));
};

describe('register.test.ts', () => {
  beforeEach(() => {
    del.sync(path.resolve(__dirname, './fixtures/app8/typings'), { force: true });
  });

  it('should not start register if env.ETS_REGISTER_PID is exist', async () => {
    const { stdout, stderr } = await getStd(
      runRegister({ env: { ETS_REGISTER_PID: '123', NODE_DEBUG: 'egg-ts-helper#register' } }),
      true,
    );

    assert(!stdout.includes('create'));
    assert(stderr.includes('egg-ts-helper watcher has ran in 123'));
  });

  it('should works with --require without error', async () => {
    const ps = spawn(
      'node',
      [
        '--require',
        path.resolve(__dirname, '../register.js'),
        path.resolve(__dirname, './fixtures/app8/app/controller/home.js'),
      ],
      options,
    );

    const { stdout, stderr } = await getStd(ps);
    assert(!stderr);
    assert(stdout.includes('create'));
    assert(stdout.includes('done'));
  });

  it('should silent when NODE_ENV is test', async () => {
    const ps = spawn(
      'node',
      [
        '--require',
        path.resolve(__dirname, '../register.js'),
        path.resolve(__dirname, './fixtures/app8/app/controller/home.js'),
      ],
      {
        ...options,
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      },
    );

    const { stdout, stderr } = await getStd(ps);
    assert(!stderr);
    assert(!stdout.includes('create'));
    assert(stdout.includes('done'));
  });

  it('should auto gen jsconfig in js proj', async () => {
    const appPath = path.resolve(__dirname, './fixtures/app10');
    const jsConfigPath = path.resolve(appPath, './jsconfig.json');
    del.sync(jsConfigPath);
    const { stderr } = await getStd(runRegister({ cwd: appPath }));
    assert(!stderr);
    assert(fs.existsSync(jsConfigPath));
  });

  it('should not cover exists jsconfig.json in js proj', async () => {
    const appPath = path.resolve(__dirname, './fixtures/app11');
    const jsConfigPath = path.resolve(appPath, './jsconfig.json');
    const { stderr } = await getStd(runRegister({ cwd: appPath }));
    assert(!stderr);
    assert(fs.existsSync(jsConfigPath));
    assert(!!JSON.parse(fs.readFileSync(jsConfigPath).toString()).mySpecConfig);
  });

  it('should pass tsHelperClazz with register without error', async () => {
    let customBuild = false;
    class CustomTsHelper extends TsHelper {
      build() {
        customBuild = true;
        return this;
      }
    }
    const register = new Register({ tsHelperClazz: CustomTsHelper });
    register.init();
    assert(customBuild);
  });
});
