import { ObjectInitType } from '@eggjs/tegg-types';

import { SingletonProto } from '../../../src/index.ts';
import { Inject, InjectOptional } from '../../../src/index.js';
import { InitTypeQualifier } from '../../../src/index.ts';
import { ModuleQualifier } from '../../../src/index.ts';
import { ContextProto } from '../../../src/index.ts';
import { type ICache } from './ICache.ts';

@SingletonProto()
export class CacheService {}

@ContextProto()
export class CacheContextService {}

@SingletonProto()
export class ConstructorObject {
  constructor(
    // @ts-expect-error: readonly property in constructor
    @InitTypeQualifier(ObjectInitType.SINGLETON)
    @ModuleQualifier('foo')
    @Inject({ name: 'fooCache' })
    readonly xCache: ICache,
    // @ts-expect-error: readonly property in constructor
    @Inject() readonly cache: ICache,
    // @ts-expect-error: readonly property in constructor
    @Inject() readonly otherCache: CacheService,
    // @ts-expect-error: readonly property in constructor
    @Inject({ optional: true }) readonly optional1?: ICache | undefined,
    // @ts-expect-error: readonly property in constructor
    @InjectOptional() readonly optional2?: ICache | undefined
  ) {}
}

@SingletonProto()
export class ConstructorQualifierObject {
  constructor(
    // @ts-expect-error: readonly property in constructor
    @Inject() readonly xCache: ICache,
    // @ts-expect-error: readonly property in constructor
    @Inject() readonly cache: CacheService,
    // @ts-expect-error: readonly property in constructor
    @Inject() readonly ContextCache: CacheContextService,
    // @ts-expect-error: readonly property in constructor
    @Inject('cacheService') readonly customNameCache: CacheService,
    // @ts-expect-error: readonly property in constructor
    @InitTypeQualifier(ObjectInitType.CONTEXT)
    @Inject()
    readonly customQualifierCache1: CacheService,
    // @ts-expect-error: readonly property in constructor
    @Inject()
    @InitTypeQualifier(ObjectInitType.CONTEXT)
    readonly customQualifierCache2: CacheService
  ) {}
}
