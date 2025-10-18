import { AbstractEggContext } from '@eggjs/tegg-runtime';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';

export class StandaloneContext extends AbstractEggContext {
  id: string;

  constructor() {
    super();
    this.id = IdenticalUtil.createContextId();
  }
}
