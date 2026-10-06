// This plugin package IS the AOP module: the module scan collects these
// re-exported hook classes (decorated in @eggjs/aop-runtime /
// @eggjs/aop-decorator) into the InnerObjectLoadUnit. Enabling the plugin is
// the whole contract - no registration API.
export {
  AopContextAdviceRegistry,
  AopGraphHookRegistrar,
  EggObjectAopHook,
  EggPrototypeCrossCutHook,
  LoadUnitAopHook,
} from '@eggjs/aop-runtime';
export { CrosscutAdviceFactory } from '@eggjs/aop-decorator';

export { AopContextHook } from './lib/AopContextHook.ts';
