import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EggLoggers, EggLogger } from '../../src/index.ts';

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
});
(loggers.get('logger') as EggLogger).info('info foo');
loggers.disableConsole();
(loggers.get('logger') as EggLogger).info('info foo after disable');
