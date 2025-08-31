import { ILifecycleBoot, Application } from 'egg';

export default class AppBootHook implements ILifecycleBoot {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async didLoad() {
    console.error('didLoad');
    // Ready to call configDidLoad,
    // Config, plugin files are referred,
    // this is the last chance to modify the config.
    // throw new Error('Method not implemented.');
  }

  async willReady() {
    // All plugins have started, can do some thing before app ready
  }

  async didReady() {
    // Worker is ready, can do some things
    // don't need to block the app boot process
  }

  async serverDidReady() {
    // Server is listening.
  }

  async beforeClose() {
    // Do some thing before app close.
  }
}
