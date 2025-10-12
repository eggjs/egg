import { Application } from 'egg';

import { ViewManager } from '../../lib/view_manager.ts';

const VIEW: unique symbol = Symbol('Application#view');

export default class ViewApplication extends Application {
  /**
   * Retrieve ViewManager instance
   * @member {ViewManager} Application#view
   */
  get view(): ViewManager {
    if (!(this as any)[VIEW]) {
      (this as any)[VIEW] = new ViewManager(this);
    }
    return (this as any)[VIEW];
  }
}
