import { AccessLevel, ContextProto, Inject } from '@eggjs/tegg';

@ContextProto({ accessLevel: AccessLevel.PUBLIC })
export class EventEchoService {
  @Inject()
  private readonly event: Event;

  requestUrl(): string {
    return (this.event as any).request.url;
  }
}
