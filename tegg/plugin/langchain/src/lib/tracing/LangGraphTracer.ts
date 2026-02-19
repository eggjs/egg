import { SingletonProto, Inject, AccessLevel } from '@eggjs/tegg';
import type { Logger } from '@eggjs/tegg';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { BaseTracer, Run } from '@langchain/core/tracers/base';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class LangGraphTracer extends BaseTracer {
  @Inject()
  logger: Logger;

  name = 'LangGraphTracer';

  setName(name: string): void {
    this.name = name;
  }

  protected persistRun(run: Run): Promise<void> {
    this.logger.info(`[agent_run][${this.name}]:traceId=${run.trace_id},run=${JSON.stringify(run)}`);
    return Promise.resolve(undefined);
  }
}
