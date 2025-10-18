import {
  AccessLevel,
  ObjectInitType,
  type QualifierValue,
  type EggObject,
  type EggObjectLifeCycleContext,
} from '@eggjs/tegg-types';
import { MultiInstanceProto } from '@eggjs/core-decorator';
import { LifecycleInit } from '@eggjs/tegg-lifecycle';

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
export class FooLogger {
  loadUnitPath: string;
  foo: QualifierValue | undefined;

  @LifecycleInit()
  async init(ctx: EggObjectLifeCycleContext, obj: EggObject) {
    this.loadUnitPath = ctx.loadUnit.unitPath;
    this.foo = obj.proto.getQualifier(FOO_ATTRIBUTE);
  }
}
