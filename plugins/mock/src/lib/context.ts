export const context = {
  runInBackground(scope: any) {
    const taskName = scope._name || scope.name;
    if (taskName) {
      scope._name = taskName;
    }

    const promise = this._runInBackground(scope);
    this.app._backgroundTasks.push(promise);
  },
} as any;
