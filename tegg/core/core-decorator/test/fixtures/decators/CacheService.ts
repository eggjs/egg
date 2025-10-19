import { ContextProto, Inject, InjectOptional } from '../../../src/index.ts';
import { type ICache } from './ICache.ts';
import { TestService, TestService2 } from './OtherService.ts';

@ContextProto()
export class TestService3 {
  sayHi(): void {
    console.info('hi');
  }
}

@ContextProto()
export class TestService4 {
  sayHi(): void {
    console.info('hi');
  }
}

@ContextProto()
export default class CacheService {
  static fileName: string =
    process.platform === 'win32' ? import.meta.filename.replaceAll('\\', '/') : import.meta.filename;

  @Inject({
    name: 'fooCache',
  })
  cache: ICache;

  @Inject('testService')
  testService: TestService;

  @Inject()
  testService2: TestService2;

  @Inject()
  otherService: TestService3;

  @Inject()
  testService4: any;

  @Inject({ optional: true })
  optionalService1?: any;

  @InjectOptional()
  optionalService2?: any;
}
