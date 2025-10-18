import { AccessLevel, Inject, SingletonProto } from '@eggjs/tegg';
import { EggLogger } from 'egg-logger';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class CustomLoggerService {
  @Inject()
  xxLogger: EggLogger;

  @Inject()
  logger: EggLogger;

  @Inject()
  coreLogger: EggLogger;

  async printLog(): Promise<void> {
    this.xxLogger.info('hello logger');
    this.logger.info('hello logger');
    this.coreLogger.info('hello logger');
  }
}
