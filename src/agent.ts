import { BaseHookClass } from './lib/core/base_hook_class.js';

export class EggAgentHook extends BaseHookClass {
  configDidLoad() {
    this.agent._wrapMessenger();
  }
}
