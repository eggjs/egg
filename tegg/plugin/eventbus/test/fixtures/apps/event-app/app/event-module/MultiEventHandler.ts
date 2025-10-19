import { Event, EventContext, type IEventContext } from '@eggjs/tegg';

@Event('helloEgg')
@Event('hiEgg')
export class MultiEventHandler {
  handle(@EventContext() ctx: IEventContext, msg: string): void {
    console.log('How are you', msg, ctx);
  }
}
