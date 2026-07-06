import assert from 'node:assert';

import { IdenticalUtil } from '@eggjs/lifecycle';
import { EggPrototypeFactory, type LoadUnit, type LoadUnitLifecycleContext } from '@eggjs/metadata';
import { type LifecycleHook, LoadUnitLifecycleProto } from '@eggjs/tegg';
import { ContextHandler, ProvidedInnerObjectProto } from '@eggjs/tegg-runtime';
import { AccessLevel, ObjectInitType } from '@eggjs/tegg-types';

import { type ContextProtoMeta, ContextProtoProperty } from './constants.ts';

/**
 * Registers context-level protos resolved from the current tegg context (e.g.
 * `event`), so any module can `@Inject() event` in a request scope.
 */
@LoadUnitLifecycleProto()
export class ContextProtoLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  async preCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.name === 'serviceWorkerRuntime') {
      // can `@Inject() event`
      ContextProtoLoadUnitHook.registerPrototype(ContextProtoProperty.Event, loadUnit);
    }
  }

  static registerPrototype(protoMeta: ContextProtoMeta, loadUnit: LoadUnit): void {
    const proto = new ProvidedInnerObjectProto(
      IdenticalUtil.createProtoId(loadUnit.id, protoMeta.protoName),
      protoMeta.protoName,
      () => {
        const ctx = ContextHandler.getContext();
        assert(ctx, 'context should not be null');
        return ctx.get(protoMeta.contextKey) as object;
      },
      ObjectInitType.CONTEXT,
      loadUnit.id,
      [],
      AccessLevel.PUBLIC,
    );
    EggPrototypeFactory.instance.registerPrototype(proto, loadUnit);
  }
}
