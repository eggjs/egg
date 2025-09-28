import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { TsGenConfig } from '..';
import { declMapping } from '../config';
import * as utils from '../utils';
import { BaseGenerator } from './base.js';

const EXPORT_DEFAULT_FUNCTION = 1;
const EXPORT_DEFAULT = 2;
const EXPORT = 3;
const globalCache: { [key: string]: { [key: string]: ImportItem } } = {};

export interface ImportItem {
  import: string;
  declaration: string;
  moduleName: string;
}

export interface ConfigGeneratorParams {
  importList: string[];
  declarationList: string[];
  moduleList: string[];
}

export default class ConfigGenerator extends BaseGenerator<ConfigGeneratorParams | undefined> {
  static defaultConfig = {
    // only need to parse config.default.ts or config.ts
    pattern: 'config(.default|).(ts|js)',
    interface: declMapping.config,
  };

  buildParams(config: TsGenConfig) {
    const { baseConfig } = this;
    const fileList = config.fileList;
    const cache = globalCache[baseConfig.id] = globalCache[baseConfig.id] || {};
    if (!fileList.length) return;

    const importList: string[] = [];
    const declarationList: string[] = [];
    const moduleList: string[] = [];
    fileList.forEach(f => {
      const abUrl = path.resolve(config.dir, f);

      // read from cache
      if (!cache[abUrl] || config.file === abUrl) {
        const skipLibCheck = !!baseConfig.tsConfig.skipLibCheck;
        const { type, usePowerPartial } = checkConfigReturnType(abUrl);

        // skip when not usePowerPartial and skipLibCheck in ts file
        // because it maybe cause types error.
        if (path.extname(f) !== '.js' && !usePowerPartial && !skipLibCheck) return;

        const { moduleName: sModuleName } = utils.getModuleObjByPath(f);
        const moduleName = `Export${sModuleName}`;
        const importContext = utils.getImportStr(
          config.dtsDir,
          abUrl,
          moduleName,
          type === EXPORT,
        );

        let tds = `type ${sModuleName} = `;
        if (type === EXPORT_DEFAULT_FUNCTION) {
          tds += `ReturnType<typeof ${moduleName}>;`;
        } else if (type === EXPORT_DEFAULT || type === EXPORT) {
          tds += `typeof ${moduleName};`;
        } else {
          return;
        }

        // cache the file
        cache[abUrl] = {
          import: importContext,
          declaration: tds,
          moduleName: sModuleName,
        };
      }

      const cacheItem = cache[abUrl];
      importList.push(cacheItem.import);
      declarationList.push(cacheItem.declaration);
      moduleList.push(cacheItem.moduleName);
    });

    return {
      importList,
      declarationList,
      moduleList,
    };
  }

  renderWithParams(config: TsGenConfig, params?: ConfigGeneratorParams) {
    const dist = path.resolve(config.dtsDir, 'index.d.ts');
    if (!params) return { dist };
    if (!params.importList.length) return { dist };

    const { baseConfig } = this;
    const { importList, declarationList, moduleList } = params;
    const newConfigType = `New${config.interface}`;
    return {
      dist,
      content:
        `import { ${config.interface} } from '${baseConfig.framework}';\n` +
        `${importList.join('\n')}\n` +
        `${declarationList.join('\n')}\n` +
        `type ${newConfigType} = ${moduleList.join(' & ')};\n` +
        `declare module '${baseConfig.framework}' {\n` +
        `  interface ${config.interface} extends ${newConfigType} { }\n` +
        '}',
    };
  }
}

// check config return type.
export function checkConfigReturnType(f: string) {
  const result = utils.findExportNode(fs.readFileSync(f, 'utf-8'));
  const resp: { type: number | undefined; usePowerPartial: boolean } = {
    type: undefined,
    usePowerPartial: false,
  };

  if (result.exportDefaultNode) {
    const exportDefaultNode = result.exportDefaultNode;
    if (ts.isFunctionLike(exportDefaultNode)) {
      if ((ts.isFunctionDeclaration(exportDefaultNode) || ts.isArrowFunction(exportDefaultNode)) && exportDefaultNode.body) {
        exportDefaultNode.body.forEachChild(tNode => {
          if (!resp.usePowerPartial && ts.isVariableStatement(tNode)) {
            // check wether use PowerPartial<EggAppInfo>
            resp.usePowerPartial = !!tNode.declarationList.declarations.find(decl => {
              let typeText = decl.type ? decl.type.getText() : undefined;
              if (decl.initializer && ts.isAsExpression(decl.initializer) && decl.initializer.type) {
                typeText = decl.initializer.type.getText();
              }
              return !!(typeText && typeText.includes('PowerPartial') && typeText.includes('EggAppConfig'));
            });
          }
        });
      }

      resp.type = EXPORT_DEFAULT_FUNCTION;
    } else {
      resp.type = EXPORT_DEFAULT;
    }
  } else if (result.exportNodeList.length) {
    resp.type = EXPORT;
  }

  return resp;
}
