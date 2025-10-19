import { AccessLevel, SingletonProto, Inject, type RuntimeConfig } from '@eggjs/tegg';
import type { EggAppConfig } from 'egg';

interface XSessionUser {
  userName: string;
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class ConfigService {
  @Inject()
  private user: XSessionUser;

  @Inject()
  private config: EggAppConfig;

  @Inject()
  private runtimeConfig: RuntimeConfig;

  getBaseDir(): string {
    return this.config.baseDir;
  }

  async getCurrentUserName(): Promise<string> {
    return this.user.userName;
  }

  getRuntimeConfig(): RuntimeConfig {
    return this.runtimeConfig;
  }
}
