import { AccessLevel, SingletonProto, Inject } from '@eggjs/tegg';
import { type EggAppConfig } from 'egg';

interface XSessionUser {
  userName: string;
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class ConfigService {
  @Inject()
  user: XSessionUser;

  @Inject()
  config: EggAppConfig;

  getBaseDir(): string {
    return this.config.baseDir;
  }

  async getCurrentUserName(): Promise<string> {
    return this.user.userName;
  }
}
