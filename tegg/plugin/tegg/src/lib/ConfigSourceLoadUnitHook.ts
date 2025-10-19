import type { LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-metadata';
import {
  type LifecycleHook,
  PrototypeUtil,
  QualifierUtil,
  ConfigSourceQualifier,
  ConfigSourceQualifierAttribute,
} from '@eggjs/tegg';

/**
 * Copy from standalone/src/ConfigSourceLoadUnitHook
 * Hook for inject moduleConfig.
 * Add default qualifier value is current module name.
 */
export class ConfigSourceLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  async preCreate(ctx: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    const classList = await ctx.loader.load();
    for (const clazz of classList) {
      const injectObjects = PrototypeUtil.getInjectObjects(clazz);
      const moduleConfigObject = injectObjects.find(t => t.objName === 'moduleConfig');
      const configSourceQualifier = QualifierUtil.getProperQualifier(
        clazz,
        'moduleConfig',
        ConfigSourceQualifierAttribute
      );
      if (moduleConfigObject && !configSourceQualifier) {
        ConfigSourceQualifier(loadUnit.name)(clazz.prototype, moduleConfigObject.refName);
      }
    }
  }
}
