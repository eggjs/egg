import type { EggObjectName } from '../core-decorator/index.ts';
import type { LifecycleContext } from '../lifecycle/index.ts';
import type { EggPrototype } from '../metadata/index.ts';
import type { EggContainer, EggObject, EggObjectLifeCycleContext } from './model/index.ts';

export type ContainerGetMethod = (proto: EggPrototype) => EggContainer<LifecycleContext>;

export type CreateObjectMethod = (
  name: EggObjectName,
  proto: EggPrototype,
  lifecycleContext: EggObjectLifeCycleContext
) => Promise<EggObject>;
