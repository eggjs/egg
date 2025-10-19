import type { Context } from 'egg';
import type { EggPrototype } from '@eggjs/tegg-metadata';
import type { ScheduleMetadata, ScheduleSubscriber } from '@eggjs/tegg-schedule-decorator';
import { ROOT_PROTO } from '@eggjs/egg-module-common';
import { EggContainerFactory } from '@eggjs/tegg-runtime';

export type EggScheduleFunction = (ctx: Context, data: any) => Promise<any>;

export function eggScheduleAdapterFactory(
  proto: EggPrototype,
  metaData: ScheduleMetadata<object>
): EggScheduleFunction {
  return async function (ctx: Context, data: any) {
    ctx[ROOT_PROTO] = proto;
    await ctx.beginModuleScope(async () => {
      if (metaData.disable) return;
      const eggObject = await EggContainerFactory.getOrCreateEggObject(proto, proto.name);
      const subscriber = eggObject.obj as ScheduleSubscriber;
      await subscriber.subscribe(data);
    });
  };
}
