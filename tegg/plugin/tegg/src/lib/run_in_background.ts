import type { Application, Context } from 'egg';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { BackgroundTaskHelper } from '@eggjs/tegg-background-task';
import type { EggPrototype } from '@eggjs/tegg-metadata';
import { TEGG_CONTEXT } from '@eggjs/egg-module-common';

import { getCalleeFromStack } from './Utils.ts';

export const LONG_STACK_DELIMITER = '\n --------------------\n';

function addLongStackTrace(err: Error, causeError: Error) {
  const callSiteStack = causeError.stack;
  if (!callSiteStack || typeof callSiteStack !== 'string') {
    return;
  }
  const index = callSiteStack.indexOf('\n');
  if (index !== -1) {
    err.stack += LONG_STACK_DELIMITER + callSiteStack.substring(index + 1);
  }
}

export function hijackRunInBackground(app: Application): void {
  const eggRunInBackground = app.context.runInBackground;
  app.context.runInBackground = function runInBackground(this: Context, scope: (ctx: Context) => Promise<any>) {
    if (!this[TEGG_CONTEXT]) {
      return Reflect.apply(eggRunInBackground, this, [scope]);
    }
    const caseError = new Error('cause');
    let resolveBackgroundTask: () => void;
    const backgroundTaskPromise = new Promise<void>((resolve) => {
      resolveBackgroundTask = resolve;
    });
    const newScope = async () => {
      try {
        await scope(this);
      } catch (e) {
        addLongStackTrace(e as Error, caseError);
        throw e;
      } finally {
        resolveBackgroundTask();
      }
    };
    // @ts-expect-error _name is not defined
    const taskName = scope._name || scope.name || getCalleeFromStack(true, 2);
    // @ts-expect-error _name is not defined
    scope._name = taskName;
    Object.defineProperty(newScope, 'name', {
      value: taskName,
      enumerable: false,
      configurable: true,
      writable: false,
    });
    Reflect.apply(eggRunInBackground, this, [newScope]);

    const proto = PrototypeUtil.getClazzProto(BackgroundTaskHelper);
    const eggObject = app.eggContainerFactory.getEggObject(proto as EggPrototype);
    const backgroundTaskHelper = eggObject.obj as BackgroundTaskHelper;
    backgroundTaskHelper.run(async () => {
      await backgroundTaskPromise;
    });
  };
}
