// generator for custom loader
import { default as TsHelper, TsGenConfig, TsHelperConfig } from '../core';
import { declMapping } from '../config';
import * as utils from '../utils';
import path from 'node:path';

const customWatcherName = 'custom';
const customSpecRef = `${customWatcherName}_spec_ref`;
const DeclareMapping = utils.pickFields<keyof typeof declMapping>(declMapping, [ 'ctx', 'app' ]);

export default function CustomGenerator(config: TsGenConfig, baseConfig: TsHelperConfig, tsHelper: TsHelper) {
  const createCustomLoader = (eggInfo: utils.EggInfoResult) => {
    const eggConfig = eggInfo.config || {};
    const newCustomWatcherList: string[] = [];

    if (eggConfig.customLoader) {
      Object.keys(eggConfig.customLoader).forEach(key => {
        const loaderConfig = eggConfig.customLoader[key];
        if (!loaderConfig || !loaderConfig.directory) {
          return;
        }

        loaderConfig.inject = loaderConfig.inject || 'app';
        if (!DeclareMapping[loaderConfig.inject] || loaderConfig.tsd === false) return;

        // custom d.ts name
        const name = `${customWatcherName}-${key}`;
        newCustomWatcherList.push(name);

        // create a custom watcher
        tsHelper.registerWatcher(name, {
          ref: customSpecRef,
          distName: `${name}.d.ts`,
          directory: loaderConfig.directory,
          pattern: loaderConfig.match,
          ignore: loaderConfig.ignore,
          caseStyle: loaderConfig.caseStyle || 'lower',
          interface: loaderConfig.interface || declMapping[key],
          declareTo: `${DeclareMapping[loaderConfig.inject]}.${key}`,
          generator: 'auto',
          execAtInit: true,
        });
      });
    }

    // collect watcher which is need to remove.
    const removeList = tsHelper.watcherList.filter(w => (
      w.ref === customSpecRef && !newCustomWatcherList.includes(w.name)
    ));

    // remove watcher and old d.ts
    tsHelper.destroyWatcher.apply(tsHelper, removeList.map(w => w.name));
    return removeList.map(w => ({
      dist: path.resolve(w.dtsDir, `${w.name}.d.ts`),
    }));
  };

  // reload egg info by file
  return utils.getEggInfo({
    cwd: baseConfig.cwd,
    customLoader: baseConfig.customLoader,
    cacheIndex: baseConfig.id,
    async: !!config.file,
    callback: createCustomLoader,
  });
}

CustomGenerator.isPrivate = true;
CustomGenerator.defaultConfig = {
  directory: 'config',
  execAtInit: true,
  pattern: [
    'config*(.local|.default).+(ts|js)',
    'plugin*(.local|.default).+(ts|js)',
  ],
};
