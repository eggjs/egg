import {
  LoadUnitLifecycleProto,
  PrototypeUtil,
  QualifierUtil,
  ConfigSourceQualifier,
  ConfigSourceQualifierAttribute,
} from '@eggjs/core-decorator';
import type { LifecycleHook } from '@eggjs/lifecycle';
import type { LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-types';

/**
 * Host-agnostic module plugin hook shared by the egg plugin and the
 * standalone app: gives every `moduleConfig` injection a default
 * ConfigSourceQualifier of the owning module's name.
 */
@LoadUnitLifecycleProto()
export class ConfigSourceLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  async preCreate(ctx: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    const classList = await ctx.loader.load();
    for (const clazz of classList) {
      const injectObjects = PrototypeUtil.getInjectObjects(clazz);
      const moduleConfigObject = injectObjects.find((t) => t.objName === 'moduleConfig');
      const configSourceQualifier = QualifierUtil.getProperQualifier(
        clazz,
        'moduleConfig',
        ConfigSourceQualifierAttribute,
      );
      if (moduleConfigObject && !configSourceQualifier) {
        ConfigSourceQualifier(loadUnit.name)(clazz.prototype, moduleConfigObject.refName);
      }
    }
  }
}
