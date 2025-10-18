import { AccessLevel, SingletonProto, Inject } from '@eggjs/tegg';

interface Tracer {
  traceId: string;
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class TraceService {
  @Inject()
  tracer: Tracer;

  getTraceId(): string {
    return this.tracer.traceId;
  }
}
