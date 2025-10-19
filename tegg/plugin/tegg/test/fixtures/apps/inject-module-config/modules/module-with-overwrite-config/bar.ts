import { AccessLevel, ContextProto, Inject, ModuleConfigs } from '@eggjs/tegg';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Bar {
  @Inject()
  moduleConfigs: ModuleConfigs;

  @Inject()
  moduleConfig: Record<string, any>;

  async getConfig(): Promise<object> {
    return {
      moduleConfigs: this.moduleConfigs.get('overwrite'),
      moduleConfig: this.moduleConfig,
    };
  }
}
