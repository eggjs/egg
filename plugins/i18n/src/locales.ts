import { debuglog } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

import ini from 'ini';
import yaml from 'js-yaml';
import { exists, readJSON } from 'utility';
import { importModule } from '@eggjs/utils';
import type { Application } from 'egg';

import type { I18nConfig } from './config/config.default.ts';
import { I18N_RESOURCES } from './app/extend/application.ts';
import { formatLocale, isObject } from './utils.ts';

const debug = debuglog('egg/i18n/locales');

export async function loadLocaleResources(app: Application, options: I18nConfig) {
  const localeDirs = options.dirs;
  const resources: Record<string, Record<string, string>> = {};

  if (options.dir && !localeDirs.includes(options.dir)) {
    app.deprecate('[@eggjs/i18n] `config.i18n.dir` is deprecated, please use `config.i18n.dirs` instead');
    localeDirs.push(options.dir);
  }

  for (const dir of localeDirs) {
    if (!(await exists(dir))) {
      continue;
    }

    const names = await fs.readdir(dir);
    for (const name of names) {
      const filepath = path.join(dir, name);
      // support en_US.js => en-US.js
      const locale = formatLocale(name.split('.')[0]);
      let resource: Record<string, string> = {};

      if (name.endsWith('.js') || name.endsWith('.ts')) {
        resource = flattening(
          await importModule(filepath, {
            importDefaultOnly: true,
          })
        );
      } else if (name.endsWith('.json')) {
        resource = flattening(await readJSON(filepath));
      } else if (name.endsWith('.properties')) {
        resource = ini.parse(await fs.readFile(filepath, 'utf8'));
      } else if (name.endsWith('.yml') || name.endsWith('.yaml')) {
        resource = flattening(yaml.load(await fs.readFile(filepath, 'utf8')));
      }

      resources[locale] = resources[locale] || {};
      Object.assign(resources[locale], resource);
    }
  }

  debug('Init locales with %j, got %j resources', options, Object.keys(resources));
  app[I18N_RESOURCES] = resources;
}

function flattening(data: any) {
  const result: Record<string, string> = {};

  function deepFlat(data: any, prefix: string) {
    for (const key in data) {
      const value = data[key];
      const k = prefix ? prefix + '.' + key : key;
      if (isObject(value)) {
        deepFlat(value, k);
      } else {
        result[k] = String(value);
      }
    }
  }

  deepFlat(data, '');

  return result;
}
