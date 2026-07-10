import type { ControllerTypeLike } from '@eggjs/controller-decorator';
import { TeggScope } from '@eggjs/tegg-types';

import type { ControllerRegisterFactory, RegisterCreator } from './ControllerRegisterFactory.ts';

const DEFAULT_REGISTERS_SLOT = Symbol('tegg:controller:defaultRegisterCreators');

/**
 * Per-app pre-registration queue for transport register creators.
 *
 * A host whose transport creator needs host objects available only
 * imperatively (the egg host: creators close over `app`) enqueues them during
 * early boot (before the InnerObjectLoadUnit exists); the shared
 * controller-plugin factory proto drains the queue when it materializes.
 * Hosts whose creators are container citizens (service worker fetch
 * providers) keep registering on the injected factory directly.
 */
export class ControllerRegisterDefaults {
  static #queue(): [ControllerTypeLike, RegisterCreator<any>][] {
    return TeggScope.resolve(DEFAULT_REGISTERS_SLOT, () => [], 'ControllerRegisterDefaults.queue');
  }

  static enqueue(type: ControllerTypeLike, creator: RegisterCreator<any>): void {
    ControllerRegisterDefaults.#queue().push([type, creator]);
  }

  static drain(factory: ControllerRegisterFactory<any>): void {
    for (const [type, creator] of ControllerRegisterDefaults.#queue()) {
      factory.registerControllerRegister(type, creator);
    }
  }
}
