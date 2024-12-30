import { BaseHookClass } from './lib/core/base_hook_class.js';

export default class EggAgentHook extends BaseHookClass {
  configDidLoad() {
    this.agent._wrapMessenger();
  }
}
