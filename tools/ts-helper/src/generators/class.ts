import { debuglog } from 'node:util';
import path from 'node:path';
import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';

const debug = debuglog('egg-ts-helper#generators_class');

export default function ClassGenerator(config: TsGenConfig, baseConfig: TsHelperConfig) {
  const fileList = config.fileList;
  const dist = path.resolve(config.dtsDir, config.distName);

  debug('file list : %o', fileList);
  if (!fileList.length) {
    return { dist };
  }

  // using to compose import code
  let importStr = '';
  // using to create interface mapping
  const interfaceMap: PlainObject = {};

  fileList.forEach(f => {
    const { props, moduleName: sModuleName } = utils.getModuleObjByPath(f);
    const moduleName = `Export${sModuleName}`;
    const importContext = utils.getImportStr(
      config.dtsDir,
      path.join(config.dir, f),
      moduleName,
    );

    importStr += `${importContext}\n`;

    // create mapping
    let collector = interfaceMap;
    while (props.length) {
      const name = utils.camelProp(
        props.shift() as string,
        config.caseStyle || baseConfig.caseStyle,
      );

      if (!props.length) {
        collector[name] = moduleName;
      } else {
        collector = collector[name] = typeof collector[name] === 'object' ? collector[name] : Object.create(Object.prototype, {
          parentModuleName: {
            value: typeof collector[name] === 'string' ? collector[name] : undefined,
          },
        });
      }
    }
  });

  // interface name
  const interfaceName = config.interface || `T_${config.name.replace(/[.-]/g, '_')}`;

  // add mount interface
  let declareInterface;
  if (config.declareTo) {
    const interfaceList: string[] = config.declareTo.split('.');
    declareInterface = composeInterface(
      interfaceList.slice(1).concat(interfaceName),
      interfaceList[0],
      undefined,
      '  ',
    );
  }

  return {
    dist,
    content:
      `${importStr}\n` +
      `declare module '${config.framework || baseConfig.framework}' {\n` +
      (declareInterface ? `${declareInterface}\n` : '') +
      composeInterface(
        interfaceMap,
        interfaceName,
        utils.strToFn(config.interfaceHandle),
        '  ',
      ) +
      '}\n',
  };
}

ClassGenerator.defaultConfig = {
  distName: 'index.d.ts',
};

// composing all the interface
function composeInterface(
  obj: PlainObject | string[],
  wrapInterface?: string,
  preHandle?: (v: string) => string,
  indent?: string,
) {
  let prev = '';
  let mid = '';
  let after = '';
  indent = indent || '';

  if (wrapInterface) {
    prev = `${indent}interface ${wrapInterface} {\n`;
    after = `${indent}}\n`;
    indent += '  ';
  }

  // compose array to object
  // ['abc', 'bbc', 'ccc'] => { abc: { bbc: 'ccc' } }
  if (Array.isArray(obj)) {
    let curr: any = obj.pop();
    while (obj.length) {
      curr = { [obj.pop()!]: curr };
    }
    obj = curr;
  }

  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (typeof val === 'string') {
      mid += `${indent + key}: ${preHandle ? preHandle(val) : val};\n`;
    } else {
      const newVal = composeInterface(val, undefined, preHandle, indent + '  ');
      if (newVal) {
        mid += `${indent + key}: ${val.parentModuleName ? `${val.parentModuleName} & ` : ''}{\n${newVal + indent}}\n`;
      }
    }
  });

  return `${prev}${mid}${after}`;
}
