import { PrototypeUtil, SingletonProto } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import type { EggProtoImplClass, ScheduleOptions, ScheduleParams, ScheduleSubscriber } from '@eggjs/tegg-types';
import { AccessLevel } from '@eggjs/tegg-types';

import { ScheduleInfoUtil } from '../util/index.ts';

export function Schedule<T>(param: ScheduleParams<T>, options?: ScheduleOptions) {
  return function (clazz: EggProtoImplClass<ScheduleSubscriber>): void {
    ScheduleInfoUtil.setIsSchedule(true, clazz);
    ScheduleInfoUtil.setScheduleParams(param, clazz);
    if (options) {
      ScheduleInfoUtil.setScheduleOptions(options, clazz);
    }
    const func = SingletonProto({
      name: clazz.name,
      accessLevel: AccessLevel.PUBLIC,
    });
    func(clazz);

    PrototypeUtil.setFilePath(clazz, StackUtil.getCalleeFromStack(false, 5));
  };
}
