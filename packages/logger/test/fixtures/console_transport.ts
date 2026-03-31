import { Logger, ConsoleTransport } from '../../src/index.ts';

const options = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const logger = new Logger();
logger.set('console', new ConsoleTransport(options));
logger.debug('debug foo');
logger.info('info foo');
logger.warn('warn foo');
logger.error('error foo');
logger.write('write foo');
process.exit(0);
