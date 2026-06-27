import assert from 'node:assert';
import { IdenticalUtil, LifecycleHook } from '@eggjs/tegg-lifecycle';
import { ContextHandler, EggPrototypeFactory, LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg/helper';
import { StandaloneInnerObjectProto } from '@eggjs/tegg-standalone';
import { ObjectInitType } from '@eggjs/tegg-types';
import { ProtoMeta } from '../types.ts';
import { ContextProtoProperty } from '../constants.ts';

export class ContextProtoLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly moduleName: string;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  async preCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.name === this.moduleName) {
      // can `@Inject() event`
      ContextProtoLoadUnitHook.registerPrototype(ContextProtoProperty.Event, loadUnit);
    }
  }

  static registerPrototype(protoMeta: ProtoMeta, loadUnit: LoadUnit) {
    const proto = new StandaloneInnerObjectProto(
      IdenticalUtil.createProtoId(loadUnit.id, protoMeta.protoName),
      protoMeta.protoName,
      (() => {
        const ctx = ContextHandler.getContext();
        assert(ctx, 'context should not be null');
        return ctx.get(protoMeta.contextKey);
      }) as any,
      ObjectInitType.CONTEXT,
      loadUnit.id,
      [],
    );
    EggPrototypeFactory.instance.registerPrototype(proto, loadUnit);
  }
}
