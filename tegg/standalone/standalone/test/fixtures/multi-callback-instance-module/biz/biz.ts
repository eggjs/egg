import { Inject, SingletonProto, AccessLevel } from '@eggjs/tegg';
import { DynamicLogger, LogPath } from '../logger/DynamicLogger.js';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Biz {
  @Inject({
    name: 'dynamicLogger',
  })
  @LogPath('fooBiz')
  fooDynamicLogger: DynamicLogger;

  @Inject({
    name: 'dynamicLogger',
  })
  @LogPath('barBiz')
  barDynamicLogger: DynamicLogger;

  async doSomething(): Promise<void> {
    await this.fooDynamicLogger.info('hello, foo biz');
    await this.barDynamicLogger.info('hello, bar biz');
  }
}
