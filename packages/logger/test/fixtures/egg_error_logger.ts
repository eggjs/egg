import { EggErrorLogger } from '../../src/index.ts';

const options = JSON.parse(process.argv[2]);
options.buffer = false;
const logger = new EggErrorLogger(options);
logger.debug('debug foo');
logger.info('info foo');
logger.warn('warn foo');
logger.error('error foo');
