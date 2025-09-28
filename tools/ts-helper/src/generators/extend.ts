import { debuglog } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import * as utils from '../utils';
import { declMapping } from '../config';
import { GeneratorResult, TsGenConfig, TsHelperConfig } from '..';

const debug = debuglog('egg-ts-helper#generators_extend');

export default function ExtendGenerator(config: TsGenConfig, baseConfig: TsHelperConfig) {
  const fileList = config.file ? [ config.file ] : config.fileList;

  debug('file list : %o', fileList);
  if (!fileList.length) {
    // clean files
    return Object.keys(config.interface).map(key => ({
      dist: path.resolve(config.dtsDir, `${key}.d.ts`),
    }));
  }

  const tsList: GeneratorResult[] = [];
  fileList.forEach(f => {
    let basename = path.basename(f);
    basename = basename.substring(0, basename.lastIndexOf('.'));
    const moduleNames = basename.split('.');
    const interfaceNameKey = moduleNames[0];
    const interfaceEnvironment = moduleNames[1]
      ? moduleNames[1].replace(/^[a-z]/, r => r.toUpperCase())
      : '';

    const interfaceName = config.interface[interfaceNameKey];
    if (!interfaceName) {
      return;
    }

    const dist = path.resolve(config.dtsDir, `${basename}.d.ts`);
    f = path.resolve(config.dir, f);
    if (!fs.existsSync(f)) {
      return tsList.push({ dist });
    }

    // get import info
    const moduleName = `Extend${interfaceEnvironment}${interfaceName}`;
    const importContext = utils.getImportStr(config.dtsDir, f, moduleName);
    tsList.push({
      dist,
      content:
        `${importContext}\n` +
        `type ${moduleName}Type = typeof ${moduleName};\n` +
        `declare module '${baseConfig.framework}' {\n` +
        `  interface ${interfaceName} extends ${moduleName}Type { }\n` +
        '}',
    });
  });

  return tsList;
}

// default config
ExtendGenerator.defaultConfig = {
  interface: utils.pickFields<keyof typeof declMapping>(declMapping, [
    'context',
    'application',
    'agent',
    'request',
    'response',
    'helper',
  ]),
};
