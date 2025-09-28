import { EggCore } from '@eggjs/core';
import { ViewManager } from '../../lib/view_manager.js';

const VIEW = Symbol('Application#view');

export default class Application extends EggCore {
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

declare module '@eggjs/core' {
  interface EggCore {
    get view(): ViewManager;
  }
}
