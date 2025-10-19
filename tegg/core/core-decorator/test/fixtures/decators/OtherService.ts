import { ContextProto } from '../../../src/index.ts';

@ContextProto()
export class TestService {
  sayHi(): void {
    console.info('hi');
  }
}

@ContextProto({ name: 'abcabc' })
export class TestService2 {
  sayHi(): void {
    console.info('hi');
  }
}
