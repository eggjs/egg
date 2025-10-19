import { Event } from '@eggjs/tegg';

@Event('helloEgg')
export class HelloLogger {
  handle(msg: string): void {
    console.log('hello, ', msg);
  }
}
