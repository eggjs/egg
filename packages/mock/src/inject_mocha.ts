import { debuglog } from 'node:util';

import { getRequire } from '@eggjs/utils';

import { injectContext } from './lib/inject_context.ts';

const debug = debuglog('egg/mock/inject_mocha');

/**
 * Find active node mocha instances.
 */
function findNodeJSMocha() {
  let children: any;
  if (typeof require === 'function') {
    children = require.cache || {};
  } else {
    // FIXME: not work on ESM
    children = getRequire().cache || {};
    debug('createRequire on esm');
  }

  return Object.keys(children)
    .filter(function (child) {
      const val = children[child].exports;
      return typeof val === 'function' && val.name === 'Mocha';
    })
    .map(function (child) {
      return children[child].exports;
    });
}

import 'mocha';

const modules = findNodeJSMocha();
debug('modules length: %s', modules.length);

for (const module of modules) {
  if (!module) continue;
  injectContext(module);
}
