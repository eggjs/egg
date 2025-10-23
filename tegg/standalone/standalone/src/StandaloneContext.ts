import { AbstractEggContext } from '@eggjs/tegg-runtime';
import { IdenticalUtil } from '@eggjs/lifecycle';

export class StandaloneContext extends AbstractEggContext {
  id: string;

  constructor() {
    super();
    this.id = IdenticalUtil.createContextId();
  }
}
