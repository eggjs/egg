import { Application } from 'egg';
import Realm from 'leoric';

// @ts-expect-error: the library definition is wrong
const Logger = Realm.Logger;

export default class OrmAppHook {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async didLoad() {
    await this.app.leoricRegister.ready();
    const app = this.app;
    for (const realm of this.app.leoricRegister.realmMap.values()) {
      (realm.driver as any).logger = new Logger({
        logQuery(sql: any, _: any, options: any) {
          const path = options.Model?.ctx?.path;
          app.logger.warn('sql: %s path: %s', sql, path);
        },
      });
    }
  }
}
