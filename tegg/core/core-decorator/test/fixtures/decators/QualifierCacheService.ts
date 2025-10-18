import { ObjectInitType } from '@eggjs/tegg-types';

import { ContextProto, InitTypeQualifier, Inject, ModuleQualifier, SingletonProto } from '../../../src/index.ts';
import { type ICache } from './ICache.ts';

@ContextProto()
export class TestContextService {}

@SingletonProto()
export class TestSingletonService {}

@ContextProto()
export default class CacheService {
  @Inject({
    name: 'fooCache',
  })
  @InitTypeQualifier(ObjectInitType.SINGLETON)
  @ModuleQualifier('foo')
  cache: ICache;

  @Inject()
  interfaceService: ICache;

  @Inject()
  testContextService: TestContextService;

  @Inject()
  testSingletonService: TestSingletonService;

  @Inject('testSingletonService')
  customNameService: TestSingletonService;

  @InitTypeQualifier(ObjectInitType.CONTEXT)
  @Inject()
  customQualifierService1: TestSingletonService;

  @Inject()
  @InitTypeQualifier(ObjectInitType.CONTEXT)
  customQualifierService2: TestSingletonService;
}
