import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EggLoggers } from '../../src/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = path.join(__dirname, 'tmp');
const loggers = new EggLoggers({
  logger: {
    type: 'application',
    consoleLevel: 'INFO',
    dir: tmp,
    appLogName: 'app-web.log',
    coreLogName: 'egg-web.log',
    agentLogName: 'egg-agent.log',
    errorLogName: 'common-error.log',
    buffer: false,
  },
  customLogger: {
    aLogger: {
      consoleLevel: 'INFO',
      file: 'console_duplicate.log',
    },
  },
});
(loggers as unknown as { logger: { error: (msg: string) => void } }).logger.error('built-in error');
(loggers as unknown as { aLogger: { info: (msg: string) => void; error: (msg: string) => void } }).aLogger.info(
  'custom info',
);
(loggers as unknown as { aLogger: { error: (msg: string) => void } }).aLogger.error('custom error');
