import { AccessLevel, EggQualifier, EggType, Inject, SingletonProto } from '@eggjs/tegg';
import { EggLogger } from 'egg-logger';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class SingletonFooService {
  @Inject()
  @EggQualifier(EggType.APP)
  logger: EggLogger;

  async printLog(): Promise<void> {
    this.logger.info('hello logger');
  }
}
