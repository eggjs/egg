import { type ILifecycleBoot, Application } from 'egg';

export default class AppBootHook implements ILifecycleBoot {
  private readonly app;

  constructor(app: Application) {
    this.app = app;
  }

  async didLoad(): Promise<void> {
    console.error('didLoad %o', this.app.type);
    // Ready to call configDidLoad,
    // Config, plugin files are referred,
    // this is the last chance to modify the config.
    // throw new Error('Method not implemented.');
  }

  async willReady(): Promise<void> {
    // All plugins have started, can do some thing before app ready
  }

  async didReady(): Promise<void> {
    // Worker is ready, can do some things
    // don't need to block the app boot process
  }

  async serverDidReady(): Promise<void> {
    // Server is listening.
  }

  async beforeClose(): Promise<void> {
    // Do some thing before app close.
  }
}
