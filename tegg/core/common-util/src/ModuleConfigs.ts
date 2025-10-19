import type { ModuleConfig, ModuleConfigHolder } from '@eggjs/tegg-types';

export class ModuleConfigs {
  readonly inner: Record<string, ModuleConfigHolder>;

  constructor(inner: Record<string, ModuleConfigHolder>) {
    this.inner = inner;
  }

  get(moduleName: string): ModuleConfig | undefined {
    return this.inner[moduleName]?.config;
  }
}

export type { ModuleConfig };
