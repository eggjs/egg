import assert from 'node:assert';
import { debuglog } from 'node:util';

import type { Logger } from '../logger.ts';
import { assign, type EggLoggerOptions, type EggLoggersOptions, type EggLoggersConfig } from '../utils.ts';
import { EggCustomLogger } from './custom_logger.ts';
import { EggErrorLogger } from './error_logger.ts';
import { EggLogger } from './logger.ts';

const debug = debuglog('egg:logger');

const defaults: EggLoggersOptions = {
  env: 'default',
  type: '',
  dir: '',
  encoding: 'utf8',
  level: 'INFO',
  consoleLevel: 'NONE',
  outputJSON: false,
  outputJSONOnly: false,
  buffer: true,
  appLogName: '',
  coreLogName: '',
  agentLogName: '',
  errorLogName: '',
  concentrateError: 'duplicate',
  concentrateErrorLoggerName: 'errorLogger',
};

/**
 * Logger Manager - creates and manages multiple loggers based on configuration.
 */
export class EggLoggers extends Map<string, Logger> {
  [key: string]: unknown;

  constructor(config: EggLoggersConfig) {
    super();

    const loggerConfig = assign({} as EggLoggersOptions, defaults, config.logger);
    const customLoggerConfig = config.customLogger ?? {};

    debug('Init loggers with options %j', loggerConfig);
    assert(loggerConfig.type, 'should pass config.logger.type');
    assert(loggerConfig.dir, 'should pass config.logger.dir');
    assert(loggerConfig.appLogName, 'should pass config.logger.appLogName');
    assert(loggerConfig.coreLogName, 'should pass config.logger.coreLogName');
    assert(loggerConfig.agentLogName, 'should pass config.logger.agentLogName');
    assert(loggerConfig.errorLogName, 'should pass config.logger.errorLogName');

    const errorLogger = new EggErrorLogger(
      assign({} as EggLoggerOptions, loggerConfig as EggLoggerOptions, {
        file: loggerConfig.errorLogName,
      }),
    );
    this.set('errorLogger', errorLogger);

    let coreLogger: EggLogger;
    let logger: EggLogger;

    if (loggerConfig.type === 'agent') {
      logger = new EggLogger(
        assign({} as EggLoggerOptions, loggerConfig as EggLoggerOptions, {
          file: loggerConfig.agentLogName,
        }),
      );
      coreLogger = new EggLogger(
        assign({} as EggLoggerOptions, loggerConfig as EggLoggerOptions, loggerConfig.coreLogger as EggLoggerOptions, {
          file: loggerConfig.agentLogName,
        }),
      );
    } else {
      logger = new EggLogger(
        assign({} as EggLoggerOptions, loggerConfig as EggLoggerOptions, {
          file: loggerConfig.appLogName,
        }),
      );
      coreLogger = new EggLogger(
        assign({} as EggLoggerOptions, loggerConfig as EggLoggerOptions, loggerConfig.coreLogger as EggLoggerOptions, {
          file: loggerConfig.coreLogName,
        }),
      );
    }

    this.set('logger', logger);
    this.set('coreLogger', coreLogger);

    for (const name in customLoggerConfig) {
      const customLogger = new EggCustomLogger(
        assign({} as EggLoggerOptions, loggerConfig as EggLoggerOptions, customLoggerConfig[name]),
      );
      this.set(name, customLogger);
    }

    // Set concentrate error at the end
    this.setConcentrateError('logger', logger);
    this.setConcentrateError('coreLogger', coreLogger);
    for (const name in customLoggerConfig) {
      this.setConcentrateError(name, this.get(name)!);
    }
  }

  override set(name: string, logger: Logger): this {
    if (this.has(name)) return this;
    this[name] = logger;
    super.set(name, logger);
    return this;
  }

  disableConsole(): void {
    for (const logger of this.values()) {
      logger.disable('console');
    }
  }

  reload(): void {
    for (const logger of this.values()) {
      logger.reload();
    }
  }

  setConcentrateError(name: string, logger: Logger): void {
    if (name === 'errorLogger') return;
    const opts = (logger as EggLogger).options as EggLoggerOptions;
    const concentrateLoggerName = opts.concentrateErrorLoggerName ?? 'errorLogger';
    const concentrateLogger = this.get(concentrateLoggerName);
    if (!concentrateLogger) return;

    switch (opts.concentrateError) {
      case 'duplicate':
        logger.duplicate('ERROR', concentrateLogger, { excludes: ['console'] });
        break;
      case 'redirect':
        logger.redirect('ERROR', concentrateLogger);
        break;
      case 'ignore':
        break;
      default:
        break;
    }
  }
}
