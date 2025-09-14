import { Dev } from '../../../../dist/esm/index.js';

export default class MyDev<T extends typeof MyDev> extends Dev<T> {
  static override description = 'Run the development server with my-egg-bin';

  static override examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<void> {
    super.run();
    console.info('this is my-egg-bin dev, baseDir: %s', this.flags.base);
  }
}
