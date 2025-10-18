import { Inject, SingletonProto } from '@eggjs/tegg';

import { Orm } from '../../../../../../src/index.ts';
import { App } from './model/App.ts';

@SingletonProto()
export class AppService {
  @Inject()
  App: typeof App;

  @Inject()
  private readonly orm: Orm;

  async createApp(data: { name: string; desc: string }): Promise<App> {
    const bone = await this.App.create(data);
    return bone as App;
  }

  async findApp(name: string): Promise<App | null> {
    const app = await this.App.findOne({ name });
    return app as App;
  }

  async rawQuery(dataSource: string, sql: string, values?: any[]) {
    return await this.orm.getClient(dataSource).query(sql, values);
  }

  async getClient(name: string) {
    return this.orm.getClient(name);
  }

  async getDefaultClient() {
    return this.orm.client;
  }
}
