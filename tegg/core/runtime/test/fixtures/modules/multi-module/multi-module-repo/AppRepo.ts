import { AccessLevel } from '@eggjs/tegg-types';
import { ContextProto, Inject } from '@eggjs/core-decorator';
import App from '../multi-module-common/model/App.js';
import PersistenceService from './PersistenceService.js';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class AppRepo {
  @Inject()
  persistenceService: PersistenceService;

  public async findApp(name: string): Promise<App | null> {
    const raw = this.persistenceService.get(name);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  }

  public async insertApp(app: App): Promise<void> {
    this.persistenceService.set(app.name, JSON.stringify(app));
  }
}
