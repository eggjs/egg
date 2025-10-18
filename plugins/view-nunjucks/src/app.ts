import type { Application, ILifecycleBoot } from 'egg';

import { NunjucksView } from './lib/view.ts';

export default class ViewNunjucksAppBoot implements ILifecycleBoot {
  app: Application;
  constructor(app: Application) {
    this.app = app;
  }

  configDidLoad(): void {
    this.app.view.use('nunjucks', NunjucksView);
  }

  async didLoad(): Promise<void> {
    await this.app.nunjucks.ready();
  }
}
