import { PropagationType } from '@eggjs/tegg-types';

import { Transactional } from '../../src/index.ts';

export class Foo {
  @Transactional()
  async defaultPropagation(msg: string): Promise<void> {
    console.log('msg: ', msg);
  }

  @Transactional({
    datasourceName: 'testDatasourceName1',
  })
  async requiredPropagation(msg: string): Promise<void> {
    console.log('msg: ', msg);
  }

  @Transactional({ propagation: PropagationType.ALWAYS_NEW })
  async alwaysNewPropagation(msg: string): Promise<void> {
    console.log('msg: ', msg);
  }
}

export class Bar {
  @Transactional({ datasourceName: 'datasourceName2' })
  async foo(msg: string): Promise<void> {
    console.log('msg: ', msg);
  }

  @Transactional({ propagation: PropagationType.ALWAYS_NEW })
  async bar(msg: string): Promise<void> {
    console.log('msg: ', msg);
  }
}

export class FooBar {
  @Transactional({ propagation: PropagationType.ALWAYS_NEW })
  async foo(msg: string): Promise<void> {
    console.log('msg: ', msg);
  }
}

export class BarFoo {
  async foo(msg: string): Promise<void> {
    console.log('msg: ', msg);
  }
}
