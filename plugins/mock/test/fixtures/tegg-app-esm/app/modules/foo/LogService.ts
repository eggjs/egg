import { AccessLevel, Inject, SingletonProto } from '@eggjs/tegg';

interface Tracer {
  traceId: string;
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class LogService {
  @Inject()
  private readonly tracer: Tracer;

  getTracerId() {
    return this.tracer.traceId;
  }
}
