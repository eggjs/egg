import { BaseCommand, Flags } from '../../../../dist/index.js';

export default class Nsp<T extends typeof Nsp> extends BaseCommand<T> {
  static override description = 'nsp check';

  static override examples = ['<%= config.bin %> <%= command.id %>'];

  static override flags = {
    foo: Flags.boolean({
      description: 'foo bar',
    }),
  };

  public async run(): Promise<void> {
    console.log('run nsp check at baseDir: %s, with %o', this.flags.base, this.args);
    if (this.flags.foo) {
      console.log('foo is true');
    }
  }
}
