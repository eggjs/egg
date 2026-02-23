import { SingletonProto, AccessLevel } from '@eggjs/core-decorator';

/**
 * A simple metrics service injected by the Advice class.
 * This tests that Advice's own dependencies are resolvable in the graph.
 */
@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class MetricsService {
  async record(method: string, duration: number): Promise<void> {
    void method;
    void duration;
  }
}
