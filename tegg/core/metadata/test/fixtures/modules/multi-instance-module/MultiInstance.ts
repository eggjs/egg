import { AccessLevel, ObjectInitType, MultiInstanceProto } from '@eggjs/core-decorator';

export const FOO_ATTRIBUTE = Symbol.for('FOO_ATTRIBUTE');

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
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
