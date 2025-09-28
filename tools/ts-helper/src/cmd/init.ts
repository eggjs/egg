import { prompt } from 'enquirer';
import * as utils from '../utils';
import path from 'node:path';
import fs from 'node:fs';
import { createTsHelperInstance } from '../';

const TYPE_TS = 'typescript';
const TYPE_JS = 'javascript';

class InitCommand implements SubCommand {
  description = 'Init egg-ts-helper in your existing project';

  options = '<type>';

  async run(_, { args, cwd }: SubCommandOption) {
    let type = args[1];
    const pkgInfo = utils.getPkgInfo(cwd);
    const typeList = [ TYPE_TS, TYPE_JS ];

    pkgInfo.egg = pkgInfo.egg || {};

    // verify type
    if (!typeList.includes(type)) {
      const result = await prompt<{ type: string }>({
        type: 'autocomplete',
        name: 'type',
        message: 'Choose the type of your project',
        choices: utils.checkMaybeIsJsProj(cwd) ? typeList.reverse() : typeList,
      }).catch(() => {
        utils.log('cancel initialization');
        return { type: '' };
      });

      type = result.type;
    }

    if (type === TYPE_JS) {
      // create jsconfig.json
      const result = utils.writeJsConfig(cwd);
      if (result) {
        utils.log('create ' + result);
      }
    } else if (type === TYPE_TS) {
      pkgInfo.egg.typescript = true;

      // create tsconfig.json
      const result = utils.writeTsConfig(cwd);
      if (result) {
        utils.log('create ' + result);
      }
    } else {
      return;
    }

    // add egg-ts-helper/register to egg.require
    pkgInfo.egg.require = pkgInfo.egg.require || [];
    if (!pkgInfo.egg.require.includes('egg-ts-helper/register') && !pkgInfo.egg.declarations) {
      pkgInfo.egg.declarations = true;
    }

    // write package.json
    const pkgDist = path.resolve(cwd, './package.json');
    fs.writeFileSync(pkgDist, JSON.stringify(pkgInfo, null, 2));
    utils.log('change ' + pkgDist);

    // build once
    utils.log('create d.ts ...');
    createTsHelperInstance({ cwd }).build();
    utils.log('complete initialization');
  }
}

export default new InitCommand();
