import { AccessLevel, ObjectInitType } from '@eggjs/tegg-types';

import { MultiInstanceProto } from '../../../src/index.ts';

export const FOO_ATTRIBUTE: symbol = Symbol.for('FOO_ATTRIBUTE');

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  protoImplType: 'foo',
  objects: [
    {
      name: 'foo',
      qualifiers: [
        {
          attribute: FOO_ATTRIBUTE,
          value: 'foo1',
        },
      ],
    },
    {
      name: 'foo',
      qualifiers: [
        {
          attribute: FOO_ATTRIBUTE,
          value: 'foo2',
        },
      ],
    },
  ],
})
export class FooLogger {}
