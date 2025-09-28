import { debuglog } from 'node:util';
import del from 'del';
import fs from 'node:fs';
import path from 'node:path';
import { mm } from '@eggjs/mock';
import { sleep, spawn, getStd, eggBin, timeoutPromise, mockFile, createTsHelper, createNodeModuleSym } from './utils';
import assert from 'node:assert';
import TsHelper, { getDefaultGeneratorConfig, Register, Command } from '../dist/';
import * as utils from '../dist/utils';

const debug = debuglog('egg-ts-helper#index.test');

describe('test/index.test.ts', () => {
  let tsHelper: TsHelper;
  before(() => {
    del.sync(path.resolve(__dirname, './fixtures/*/typings'), { force: true });
  });

  afterEach(mm.restore);

  it('should works without error', async () => {
    const dir = path.resolve(__dirname, './fixtures/app/app/service/test');
    fs.mkdirSync(dir, { recursive: true });

    tsHelper = createTsHelper({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: true,
      execAtInit: true,
      autoRemoveJs: false,
    });

    await sleep(2000);

    assert(!!tsHelper.config);
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/controller/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/extend/context.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/middleware/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/config/index.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/config/plugin.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/custom.d.ts')));
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/custom2.d.ts')));

    // caseStyle check
    const caseStylePath = path.resolve(__dirname, './fixtures/app/typings/app/casestyle/index.d.ts');
    const caseStyleContent = fs.readFileSync(caseStylePath, 'utf8');
    assert(fs.existsSync(caseStylePath));
    assert(caseStyleContent.includes('simpleTest: ExportSimpleTestSchema'));

    // dts check
    const dts = path.resolve(__dirname, './fixtures/app/typings/app/service/index.d.ts');
    fs.writeFileSync(path.resolve(dir, 'test.ts'), '');
    fs.writeFileSync(path.resolve(dir, 'test-two.ts'), '');
    debug('service file list %o', fs.readdirSync(dir));

    await sleep(2000);

    del.sync(dir, { force: true });
    const content = fs.readFileSync(dts, { encoding: 'utf-8' });
    assert(content.includes('service/test/test'));
    assert(content.includes('service/test/test-two'));
    assert(content.includes('test: AutoInstanceType<typeof ExportTestTest>'));
    assert(content.includes('testTwo: AutoInstanceType<typeof ExportTestTestTwo>'));

    await sleep(2000);

    assert(!fs.existsSync(dts));
  });

  it('should support oneForAll', async () => {
    tsHelper = createTsHelper({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: false,
      autoRemoveJs: false,
    });

    await tsHelper.build();
    await tsHelper.createOneForAll();

    const oneForAllDist = path.resolve(__dirname, './fixtures/app/typings/ets.d.ts');
    const oneForAll = fs.readFileSync(oneForAllDist, { encoding: 'utf-8' });
    assert(oneForAll.includes('import \'./app/controller/index\';'));
    assert(oneForAll.includes('import \'./app/extend/context\';'));
    assert(oneForAll.includes('import \'./app/middleware/index\';'));
    assert(oneForAll.includes('import \'./config/index\';'));
    assert(oneForAll.includes('import \'./custom\';'));
  });

  it('should works with custom oneForAll dist', async () => {
    const oneForAllDist = path.resolve(__dirname, './fixtures/app/typings/all/special.d.ts');
    tsHelper = createTsHelper({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: false,
      autoRemoveJs: false,
    });

    await tsHelper.build();
    await tsHelper.createOneForAll(oneForAllDist);

    // onForAll check
    const oneForAll = fs.readFileSync(oneForAllDist, { encoding: 'utf-8' });
    assert(oneForAll.includes('import \'../app/controller/index\';'));
    assert(oneForAll.includes('import \'../app/extend/context\';'));
    assert(oneForAll.includes('import \'../app/middleware/index\';'));
    assert(oneForAll.includes('import \'../config/index\';'));
    assert(oneForAll.includes('import \'../custom\';'));
  });

  it('should works with polling watcher', async () => {
    const dir = path.resolve(__dirname, './fixtures/app/app/service/test');
    fs.mkdirSync(dir, { recursive: true });

    tsHelper = createTsHelper({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: true,
      watchOptions: {
        usePolling: true,
      },
      execAtInit: true,
      autoRemoveJs: false,
    });

    await sleep(2000);

    assert(!!tsHelper.config);
    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/app/controller/index.d.ts')));

    const dts = path.resolve(__dirname, './fixtures/app/typings/app/service/index.d.ts');
    fs.writeFileSync(path.resolve(dir, 'test.ts'), '');
    fs.writeFileSync(path.resolve(dir, 'test-two.ts'), '');
    debug('service file list %o', fs.readdirSync(dir));

    await sleep(2000);

    del.sync(dir, { force: true });
    const content = fs.readFileSync(dts, { encoding: 'utf-8' });
    assert(content.includes('service/test/test'));
    assert(content.includes('service/test/test-two'));
    assert(content.includes('test: AutoInstanceType<typeof ExportTestTest>'));
    assert(content.includes('testTwo: AutoInstanceType<typeof ExportTestTestTwo>'));

    await sleep(2000);

    assert(!fs.existsSync(dts));
  });

  it('should compatitable with watchDirs option', async () => {
    tsHelper = createTsHelper({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: true,
      execAtInit: true,
      autoRemoveJs: false,
      watchDirs: {
        config: { pattern: 'config.*.ts' },
      } as any,
    });

    assert(tsHelper.config.generatorConfig);
    assert(tsHelper.config.generatorConfig.config.pattern === 'config.*.ts');
  });

  it('should works without error while config file changed', async () => {
    mm(utils, 'loadTsConfig', () => ({ skipLibCheck: true }));
    const dir = path.resolve(__dirname, './fixtures/app/app/service/test');
    fs.mkdirSync(dir, { recursive: true });

    tsHelper = createTsHelper({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: true,
      execAtInit: true,
      autoRemoveJs: false,
      generatorConfig: {
        config: { pattern: 'config.*.ts' },
      } as any,
    });

    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app/typings/config/index.d.ts')));
    const defaultConfigPath = path.resolve(__dirname, './fixtures/app/config/config.default.ts');
    const baseConfig = fs.readFileSync(defaultConfigPath);
    const localConfigPath = path.resolve(__dirname, './fixtures/app/config/config.local.ts');
    await sleep(2000);
    mockFile(defaultConfigPath, `${baseConfig}\n\n`)
      .then(() => {
        mockFile(defaultConfigPath, `${baseConfig}\n`);
        mockFile(localConfigPath, baseConfig);
      });

    await timeoutPromise((resolve, reject) => {
      tsHelper.on('update', (_, p) => {
        if (p === defaultConfigPath) {
          reject(new Error('should not update config.default.ts'));
        } else if (p === localConfigPath) {
          resolve();
        }
      });
    });

    await sleep(100);
  });

  it('should works without error while plugin file changed', async () => {
    tsHelper = createTsHelper({
      cwd: path.resolve(__dirname, './fixtures/app2'),
      watch: true,
      execAtInit: true,
      autoRemoveJs: false,
    });

    assert(fs.existsSync(path.resolve(__dirname, './fixtures/app2/typings/config/plugin.d.ts')));
    const defaultPluginPath = path.resolve(__dirname, './fixtures/app2/config/plugin.local.ts');
    const pluginPath = path.resolve(__dirname, './fixtures/app2/config/plugin.ts');
    await sleep(2000);
    mockFile(defaultPluginPath, undefined, pluginPath);

    await timeoutPromise(resolve => {
      tsHelper.on('update', (_, p) => {
        if (p === defaultPluginPath) {
          resolve();
        }
      });
    });
  });

  it('should remove file config file changed and remove customLoader', async () => {
    const cwd = path.resolve(__dirname, './fixtures/custom');
    tsHelper = createTsHelper({
      cwd,
      watch: true,
      execAtInit: true,
      autoRemoveJs: false,
    });

    await sleep(2000);
    let restore;
    const configPath = path.resolve(cwd, './config/config.local.ts');
    mockFile(configPath, 'export default {}').then(result => { restore = result; });

    await timeoutPromise((resolve, reject) => {
      tsHelper.on('remove', file => {
        if (file === path.resolve(cwd, './typings/app/custom3/custom-custom3.d.ts')) {
          return setTimeout(restore, 2000);
        }
        reject('should delete custom3.d.ts');
      });

      tsHelper.on('update', file => {
        if (file === path.resolve(cwd, './typings/app/custom3/custom-custom3.d.ts')) {
          return resolve();
        }
        reject('should create custom3.d.ts');
      });
    }, 30000);
  });

  it('should support rewrite by options.generatorConfig', () => {
    const generatorConfig = getDefaultGeneratorConfig();
    Object.keys(generatorConfig).forEach(key => {
      if (key === 'proxy') {
        generatorConfig[key] = {
          ...(generatorConfig[key] as any),
          path: 'app/test/proxy',
          interface: 'IProxy',
          generator: 'class',
          enabled: true,
        };
      } else {
        generatorConfig[key] = false;
      }
    });

    tsHelper = createTsHelper({
      cwd: path.resolve(__dirname, './fixtures/app3'),
      generatorConfig,
    });

    assert(tsHelper.watcherList.length === 1);
    assert(!!tsHelper.watcherList.find(w => w.name === 'proxy'));
  });

  it('should auto create customLoader with config', () => {
    const customPath = path.resolve(__dirname, './fixtures/custom');
    createTsHelper({
      cwd: customPath,
      watch: false,
      execAtInit: true,
    });
    const typingFile = path.resolve(customPath, './typings/app/custom/custom-custom.d.ts');
    assert(fs.existsSync(typingFile));
    const types = fs.readFileSync(typingFile).toString();
    assert(types.includes('interface Context'));
    assert(types.includes('test: AutoInstanceType<typeof ExportTest>;'));
    assert(types.includes('test2: AutoInstanceType<typeof ExportTest2>;'));

    const typingFile2 = path.resolve(customPath, './typings/app/custom2/custom-custom2.d.ts');
    assert(fs.existsSync(typingFile2));
    const types2 = fs.readFileSync(typingFile2).toString();
    assert(types2.includes('interface Application'));

    assert(fs.existsSync(path.resolve(customPath, './typings/app/custom3/custom-custom3.d.ts')));
    assert(!fs.existsSync(path.resolve(customPath, './typings/app/custom4/custom-custom4.d.ts')));
    assert(!fs.existsSync(path.resolve(customPath, './typings/app/custom5/custom-custom5.d.ts')));
    assert(!fs.existsSync(path.resolve(customPath, './typings/app/custom6/custom-custom6.d.ts')));
  });

  it('should support multiple directories', () => {
    const multiPath = path.resolve(__dirname, './fixtures/app-multi');
    createTsHelper({
      cwd: multiPath,
      watch: false,
      execAtInit: true,
    });

    const dts1 = path.resolve(multiPath, './typings/app/abc/custom-abc.d.ts');
    const dts2 = path.resolve(multiPath, './typings/app/bbc/custom-abc.d.ts');
    assert(fs.existsSync(dts1));
    assert(fs.existsSync(dts2));
    assert(fs.readFileSync(dts1, 'utf-8').match(/interface T_custom_abc {\s+test: AutoInstanceType<typeof ExportTest>;/));
    assert(fs.readFileSync(dts2, 'utf-8').match(/interface T_custom_abc {\s+test2: AutoInstanceType<typeof ExportTest2>;/));
  });

  it('should support read framework by package.json', () => {
    tsHelper = createTsHelper({
      cwd: path.resolve(__dirname, './fixtures/app3'),
      watch: false,
    });
    assert(tsHelper.config.framework === 'egg');
    tsHelper = createTsHelper({
      cwd: path.resolve(__dirname, './fixtures/app2'),
      watch: false,
    });
    assert(tsHelper.config.framework === 'larva');
    tsHelper = createTsHelper({
      cwd: path.resolve(__dirname, './fixtures/app4'),
      watch: false,
    });
    assert(tsHelper.config.framework === 'chair');
  });

  it('should support rewrite by package.json', () => {
    const generatorConfig = getDefaultGeneratorConfig();
    tsHelper = createTsHelper({
      cwd: path.resolve(__dirname, './fixtures/app4'),
    });
    const len = Object.keys(generatorConfig).filter(k => {
      const item = (generatorConfig[k] as any);
      return !item.hasOwnProperty('enabled') || item.enabled;
    }).length;
    assert(tsHelper.watcherList.length === len - 2);
    assert(!!tsHelper.watcherList.find(w => w.name === 'controller'));
  });

  it.skip('should works without error in real app', async () => {
    const baseDir = path.resolve(__dirname, './fixtures/real');
    tsHelper = createTsHelper({
      cwd: baseDir,
      execAtInit: true,
      autoRemoveJs: false,
    });

    const proc = spawn(eggBin, [ 'dev', '--baseDir', baseDir, '--port', '7661' ], {
      stdio: 'pipe',
      env: {
        ...process.env,
        
          NODE_ENV: 'development',
          NODE_OPTIONS: '--no-deprecation',
          TS_NODE_PROJECT: path.resolve(baseDir, './tsconfig.json'),
      },
    });

    const { stdout, stderr } = await getStd(proc, true, undefined, { stdout: 'egg started' });
    assert(!stderr, stderr);
    assert(stdout.includes('egg started on http'));
    assert(fs.existsSync(path.resolve(baseDir, './typings/app/controller/index.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/app/custom/index.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/app/extend/application.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/app/model/index.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/config/plugin.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/config/index.d.ts')));
  });

  it.skip('should works without error in unittest', async () => {
    const baseDir = path.join(__dirname, './fixtures/real-unittest/');
    del.sync(path.resolve(baseDir, './typings'));
    createNodeModuleSym(baseDir);
    const proc = spawn(eggBin, [ 'test', '--ts', '-r', path.resolve(__dirname, '../register') ], {
      cwd: baseDir,
      env: {
        ...process.env,
        ETS_SILENT: 'false',
      },
    });
    const { stdout, stderr } = await getStd(proc, true);
    assert(stdout.includes('passing'));
    assert(!stderr);
  });

  it.skip('should works without error in coverage', async () => {
    const baseDir = path.join(__dirname, './fixtures/real-unittest/');
    del.sync(path.resolve(baseDir, './typings'));
    createNodeModuleSym(baseDir);
    const proc = spawn(eggBin, [ 'cov', '--ts', '-r', path.resolve(__dirname, '../register') ], {
      cwd: baseDir,
      env: {
        ...process.env,
        ETS_SILENT: 'false',
        NODE_OPTIONS: '--no-deprecation',
      },
    });
    const { stdout, stderr } = await getStd(proc, true, undefined, { stdout: 'passing' });
    if (stderr) {
      console.error(stderr);
    }
    assert(!stderr);
    assert(stdout.includes('passing'));
  });

  it('should works in real-js app', async () => {
    const baseDir = path.resolve(__dirname, './fixtures/real-js/');
    tsHelper = createTsHelper({
      cwd: baseDir,
      execAtInit: true,
      autoRemoveJs: false,
    });

    await sleep(2000);

    assert(fs.existsSync(path.resolve(baseDir, './typings/app/controller/index.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/app/extend/context.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/app/service/index.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/app/middleware/index.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/config/index.d.ts')));
  });

  it.skip('should works in esm app', async () => {
    const baseDir = path.resolve(__dirname, './fixtures/app-esm/');
    tsHelper = createTsHelper({
      cwd: baseDir,
      execAtInit: true,
      autoRemoveJs: false,
    });

    await sleep(2000);

    assert(fs.existsSync(path.resolve(baseDir, './typings/app/controller/index.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/app/extend/context.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/app/service/index.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/app/middleware/index.d.ts')));
    assert(fs.existsSync(path.resolve(baseDir, './typings/config/index.d.ts')));
  });

  it('should support tsHelper.json and dot-prop', async () => {
    const baseDir = path.resolve(__dirname, './fixtures/app12/');
    tsHelper = createTsHelper({
      cwd: baseDir,
      execAtInit: false,
      autoRemoveJs: false,
    });

    assert(tsHelper.config.generatorConfig.dal);
    assert(tsHelper.config.generatorConfig.dal.interface === 'IDAL2');
    assert(tsHelper.config.generatorConfig.dal.directory === 'app/dal/dao');
    assert(tsHelper.config.generatorConfig.model.enabled === false);
    assert(tsHelper.config.generatorConfig.service.enabled === false);
  });

  it('should support custom config file', async () => {
    const baseDir = path.resolve(__dirname, './fixtures/app12/');
    mm(process.env, 'ETS_CONFIG_FILE', path.resolve(baseDir, 'tsCustom.json'));
    tsHelper = createTsHelper({
      cwd: baseDir,
      execAtInit: false,
      autoRemoveJs: false,
    });

    assert(tsHelper.config.generatorConfig.dal);
    assert(tsHelper.config.generatorConfig.dal.interface === 'IDAL2');
    assert(tsHelper.config.generatorConfig.dal.directory === 'app/dal/dao');
    assert(tsHelper.config.generatorConfig.model.enabled === false);
    assert(tsHelper.config.generatorConfig.service.enabled === false);
  });

  it('should support customLoader without error', () => {
    const cwd = path.resolve(__dirname, './fixtures/app');
    createTsHelper({
      cwd,
      watch: false,
      execAtInit: true,
      customLoader: {
        config: {
          customLoader: {
            specialCustom: {
              directory: 'app/custom',
              inject: 'ctx',
            },
          },
        },
      },
    });
    assert(fs.existsSync(path.resolve(cwd, './typings/app/custom/custom-specialCustom.d.ts')));
  });

  it('should export register and command', () => {
    assert(Register);
    assert(Command);
  });
});
