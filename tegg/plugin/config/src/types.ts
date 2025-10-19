import type { ReadModuleReferenceOptions, ModuleReference, ModuleConfigHolder } from '@eggjs/tegg-common-util';

declare module 'egg' {
  interface EggAppConfig {
    /**
     * tegg config
     */
    tegg: {
      readModuleOptions: ReadModuleReferenceOptions;
    };
  }

  // export type ModuleReference = ModuleReferenceAlias;

  interface ModuleConfig {}

  // interface ModuleConfigHolder {
  //   name: string;
  //   config: ModuleConfig;
  //   reference: ModuleReference;
  // }

  // interface ModuleConfigApplication {
  //   moduleReferences: readonly ModuleReference[];
  //   moduleConfigs: Record<string, ModuleConfigHolder>;
  // }

  interface EggApplicationCore {
    moduleReferences: readonly ModuleReference[];
    moduleConfigs: Record<string, ModuleConfigHolder>;
  }
}
