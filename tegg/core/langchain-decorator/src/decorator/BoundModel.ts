import { SingletonProto, PrototypeUtil } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import { AccessLevel } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { BaseChatOpenAI } from '@langchain/openai';
import type { ChatOpenAICallOptions } from '@langchain/openai';

import type { IBoundModelMetadata } from '../model/BoundModelMetadata.ts';
import { BoundModelInfoUtil } from '../util/BoundModelInfoUtil.ts';

export function BoundModel(params: IBoundModelMetadata): (constructor: EggProtoImplClass) => void {
  return (constructor: EggProtoImplClass): void => {
    const func = SingletonProto({
      accessLevel: params?.accessLevel ?? AccessLevel.PUBLIC,
      name: params?.name,
    });
    func(constructor);
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));

    BoundModelInfoUtil.setBoundModelMetadata(params, constructor);
  };
}

type BaseChatModel<T extends ChatOpenAICallOptions = ChatOpenAICallOptions> =
  InstanceType<typeof BaseChatOpenAI<T>> extends infer C ? C : never;

export type TeggBoundModel<S, CallOptions extends ChatOpenAICallOptions = ChatOpenAICallOptions> = S &
  ReturnType<NonNullable<BaseChatModel<CallOptions>['bindTools']>>;
