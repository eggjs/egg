import assert from 'node:assert/strict';

import { AccessLevel, SingletonProto, Inject, ContextProto } from '@eggjs/tegg';
import { BackgroundTaskHelper } from '@eggjs/tegg-background-task';
import { TimerUtil } from '@eggjs/tegg-common-util';

import { CountService } from './CountService.ts';

@ContextProto()
export class TestObj {
  ok = true;
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class BackgroundService {
  @Inject()
  private readonly backgroundTaskHelper: BackgroundTaskHelper;

  @Inject()
  testObj: TestObj;

  @Inject()
  private readonly countService: CountService;

  async backgroundAdd(delay = 1000) {
    this.backgroundTaskHelper.timeout = 5000;
    this.backgroundTaskHelper.run(async () => {
      await TimerUtil.sleep(delay);
      assert(this.testObj.ok);
      this.countService.count += 1;
    });
  }
}
