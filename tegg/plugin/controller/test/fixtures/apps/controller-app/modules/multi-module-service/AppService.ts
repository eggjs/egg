import { AccessLevel, ContextProto, Inject } from '@eggjs/tegg';

import App from '../multi-module-common/model/App.js';
import AppRepo from '../multi-module-repo/AppRepo.js';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class AppService {
  @Inject()
  appRepo: AppRepo;

  findApp(name: string): Promise<App | null> {
    return this.appRepo.findApp(name);
  }

  save(app: App): Promise<void> {
    return this.appRepo.insertApp(app);
  }
}
