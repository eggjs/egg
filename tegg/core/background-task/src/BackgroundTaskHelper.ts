import assert from 'node:assert';

import type { EggLogger, EggAppConfig } from 'egg';
import { ContextProto, Inject } from '@eggjs/core-decorator';
import { AccessLevel } from '@eggjs/tegg-types';
import type { EggObjectLifecycle } from '@eggjs/tegg-types';
import { ContextHandler, EggContextLifecycleUtil } from '@eggjs/tegg-runtime';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class BackgroundTaskHelper implements EggObjectLifecycle {
  @Inject()
  logger: EggLogger;

  // default timeout for async task
  timeout = 5000;

  @Inject()
  config: EggAppConfig;

  private backgroundTasks: Array<Promise<void>> = [];

  async init(): Promise<void> {
    const ctx = ContextHandler.getContext();
    assert(ctx, 'background task helper must be init in context');
    EggContextLifecycleUtil.registerObjectLifecycle(ctx, {
      preDestroy: async () => {
        await this.doPreDestroy();
      },
    });
    if (this.config.backgroundTask?.timeout) {
      this.timeout = this.config.backgroundTask.timeout;
    }
  }

  run(fn: () => Promise<void>): void {
    const backgroundTask = new Promise<void>(resolve => {
      try {
        fn()
          // fn is resolve, resolve the task
          .then(resolve)
          .catch(e => {
            e.message = '[BackgroundTaskHelper] background throw error:' + e.message;
            this.logger.error(e);
            // fn is rejected, resolve the task
            resolve();
          });
      } catch (e: any) {
        e.message = '[BackgroundTaskHelper] create background throw error:' + e.message;
        this.logger.error(e);
        // create task failed, resolve the task
        resolve();
      }
    });

    this.backgroundTasks.push(backgroundTask);
  }

  async doPreDestroy(): Promise<void> {
    // quick quit
    if (!this.backgroundTasks.length) return;
    const backgroundTasks = this.backgroundTasks.slice();
    if (this.timeout <= 0 || this.timeout === Infinity) {
      await Promise.all(backgroundTasks);
    } else {
      const { promise: timeout, resolve } = this.sleep();

      await Promise.race([
        // not block the pre destroy process too long
        timeout,
        // ensure all background task are done before destroy the context
        Promise.all(backgroundTasks),
      ]);
      // always resolve the sleep promise
      resolve();
    }
    if (this.backgroundTasks.length !== backgroundTasks.length) {
      this.backgroundTasks = this.backgroundTasks.slice(backgroundTasks.length);
      return this.doPreDestroy();
    }
  }

  private sleep() {
    let timer: NodeJS.Timeout;
    let promiseResolve: () => void;
    const now = Date.now();

    const p = new Promise<void>(r => {
      promiseResolve = r;
      timer = setTimeout(() => {
        this.logger.error(
          `[BackgroundTaskHelper] task is timeout actual is ${Date.now() - now} expect is ${this.timeout}`
        );
        r();
      }, this.timeout);
    });

    function resolve() {
      // clear timeout and resolve the promise
      clearTimeout(timer);
      promiseResolve();
    }

    return {
      promise: p,
      resolve,
    };
  }
}
