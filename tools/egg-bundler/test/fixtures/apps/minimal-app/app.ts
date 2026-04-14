import type { Application, ILifecycleBoot } from 'egg';

export default class AppBoot implements ILifecycleBoot {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async didLoad(): Promise<void> {
    (this.app as unknown as { bootStages: string[] }).bootStages ??= [];
    (this.app as unknown as { bootStages: string[] }).bootStages.push('didLoad');
  }

  async willReady(): Promise<void> {
    (this.app as unknown as { bootStages: string[] }).bootStages.push('willReady');
  }
}
