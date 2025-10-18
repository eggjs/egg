import { Event, type EventBus } from '@eggjs/eventbus-decorator';
import { AccessLevel, Inject, SingletonProto } from '@eggjs/core-decorator';
import { TimerUtil } from '@eggjs/tegg-common-util';
import type { EggLogger } from 'egg';

declare module '@eggjs/eventbus-decorator' {
  interface Events {
    timeout: () => void;
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class TimeoutProducer {
  @Inject()
  private readonly eventBus: EventBus;

  trigger() {
    this.eventBus.emit('timeout');
  }
}

@Event('timeout')
export class Timeout0Handler {
  handle() {
    throw new Error('mock error');
  }
}

@Event('timeout')
export class Timeout100Handler {
  static called = false;
  @Inject()
  private readonly logger: EggLogger;

  async handle() {
    await TimerUtil.sleep(100);
    // access logger, ensure context still alive
    this.logger.info('timeout 100');
    Timeout100Handler.called = true;
  }
}
