import { AccessLevel, SingletonProto, Inject } from '@eggjs/tegg';
import type AppService from '../multi-module-service/AppService.ts';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class AppRepo {
  @Inject()
  appService: AppService;

  public async findApp(): Promise<Record<string, any>> {
    return this.appService.findApp();
  }
}
