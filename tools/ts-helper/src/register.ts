import cluster from 'node:cluster';
import { debuglog } from 'node:util';
import TsHelper, { TsHelperOption } from './core.js';
import {
  convertString, checkMaybeIsJsProj, writeJsConfig, cleanJs,
} from './utils.js';

const debug = debuglog('egg-ts-helper#register');

export interface RegisterOption {
  tsHelperClazz?: typeof TsHelper;
}

export default class Register {
  tsHelperClazz: typeof TsHelper;

  constructor(options?: RegisterOption) {
    this.tsHelperClazz = options?.tsHelperClazz || TsHelper;
  }

  init(options?: TsHelperOption) {
    /* istanbul ignore else */
    if (!cluster.isMaster) return;

    // make sure ets only run once
    const pid = process.env.ETS_REGISTER_PID;
    if (pid) {
      debug('egg-ts-helper watcher has ran in %s', pid);
      return;
    }

    const watch = convertString(process.env.ETS_WATCH, process.env.NODE_ENV !== 'test');
    const clazz = this.tsHelperClazz;
    const cwd = options?.cwd || process.cwd();
    const instance = new clazz({ watch, ...options });

    if (checkMaybeIsJsProj(cwd)) {
      // write jsconfig if the project is wrote by js
      writeJsConfig(cwd);
    } else {
      const tsNodeMode = process.env.EGG_TYPESCRIPT === 'true';

      // no need to clean in js project
      // clean local js file at first.
      // because egg-loader cannot load the same property name to egg.
      if (tsNodeMode && instance.config.autoRemoveJs) {
        cleanJs(cwd);
      }
    }

    // cache pid to env, prevent child process executing ets again
    process.env.ETS_REGISTER_PID = `${process.pid}`;

    debug('start buidling');
    // exec building
    instance.build();
    debug('end');
    // reset ETS_REGISTER_PID
    process.env.ETS_REGISTER_PID = '';
  }
}

export { Register };
