import { BaseHookClass } from './lib/core/base_hook_class.ts';

export default class EggAgentHook extends BaseHookClass {
  configDidLoad(): void {
    this.agent._wrapMessenger();
  }
}
