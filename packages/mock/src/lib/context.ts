import { utils } from '@eggjs/core';

export const context = {
  runInBackground(scope: any) {
    /* istanbul ignore next */
    const taskName = scope._name || scope.name || utils.getCalleeFromStack(true);
    if (taskName) {
      scope._name = taskName;
    }

    const promise = this._runInBackground(scope);
    this.app._backgroundTasks.push(promise);
  },
} as any;
