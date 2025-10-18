import { AccessLevel, ObjectInitType, type QualifierValue, type ObjectInfo } from '@eggjs/tegg-types';
import { Inject, MultiInstanceInfo, MultiInstanceProto, SingletonProto } from '@eggjs/core-decorator';

export const FOO_ATTRIBUTE = Symbol.for('FOO_ATTRIBUTE');

@SingletonProto()
export class Bar {
  bar = 'bar';
}

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  objects: [
    {
      name: 'fooConstructor',
      qualifiers: [
        {
          attribute: FOO_ATTRIBUTE,
          value: 'foo1',
        },
      ],
    },
    {
      name: 'fooConstructor',
      qualifiers: [
        {
          attribute: FOO_ATTRIBUTE,
          value: 'foo2',
        },
      ],
    },
  ],
})
export class FooLoggerConstructor {
  foo: QualifierValue | undefined;
  bar: string;

  constructor(@Inject() bar: Bar, @MultiInstanceInfo([FOO_ATTRIBUTE]) objInfo: ObjectInfo) {
    this.foo = objInfo.qualifiers.find(t => t.attribute === FOO_ATTRIBUTE)?.value;
    this.bar = bar.bar;
  }
}
