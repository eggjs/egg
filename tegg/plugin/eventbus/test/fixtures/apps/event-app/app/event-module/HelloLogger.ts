import { Event } from '@eggjs/tegg';

@Event('helloEgg')
export class HelloLogger {
  handle(msg: string) {
    console.log('hello, ', msg);
  }
}
