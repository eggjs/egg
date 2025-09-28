import { Application } from 'egg';

import { ViewManager } from '../../lib/view_manager.ts';

const VIEW = Symbol('Application#view');

export default class ViewApplication extends Application {
  [VIEW]: ViewManager;

  /**
   * Retrieve ViewManager instance
   * @member {ViewManager} Application#view
   */
  get view(): ViewManager {
    if (!this[VIEW]) {
      this[VIEW] = new ViewManager(this);
    }
    return this[VIEW];
  }
}

declare module 'egg' {
  interface Application {
    get view(): ViewManager;
  }
}
