import { AccessLevel, ContextProto, Inject } from '@eggjs/tegg';
import type { FetchEvent } from '@eggjs/tegg/standalone';

@ContextProto({ accessLevel: AccessLevel.PUBLIC })
export class EventEchoService {
  @Inject()
  private readonly event: FetchEvent;

  requestUrl(): string {
    return this.event.request.url;
  }
}
