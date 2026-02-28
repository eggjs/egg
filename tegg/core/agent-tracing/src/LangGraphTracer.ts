import { SingletonProto, Inject } from '@eggjs/core-decorator';
import { AccessLevel } from '@eggjs/tegg-types';
import { BaseTracer } from '@langchain/core/tracers/base';
import type { Run } from '@langchain/core/tracers/base';

import type { TracingService } from './TracingService.ts';
import { RunStatus, type TracerConfig, applyTracerConfig } from './types.ts';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class LangGraphTracer extends BaseTracer {
  @Inject()
  private tracingService: TracingService;

  name = 'LangGraphTracer';

  agentName = '';

  /**
   * Configure the tracer with agent name and service credentials.
   */
  configure(config: TracerConfig): void {
    applyTracerConfig(this, this.tracingService, config);
  }

  protected persistRun(_: Run): Promise<void> {
    return Promise.resolve(undefined);
  }

  private logTrace(run: Run, status: RunStatus): void {
    this.tracingService.logTrace(run, status, this.name, this.agentName);
  }

  onChainStart(run: Run): void | Promise<void> {
    this.logTrace(run, RunStatus.START);
  }
  onChainEnd(run: Run): void | Promise<void> {
    this.logTrace(run, RunStatus.END);
  }
  onChainError(run: Run): void | Promise<void> {
    this.logTrace(run, RunStatus.ERROR);
  }

  onToolStart(run: Run): void | Promise<void> {
    this.logTrace(run, RunStatus.START);
  }
  onToolEnd(run: Run): void | Promise<void> {
    this.logTrace(run, RunStatus.END);
  }

  onToolError(run: Run): void | Promise<void> {
    this.logTrace(run, RunStatus.ERROR);
  }

  onLLMStart(run: Run): void | Promise<void> {
    this.logTrace(run, RunStatus.START);
  }
  onLLMEnd(run: Run): void | Promise<void> {
    this.logTrace(run, RunStatus.END);
  }
  onLLMError(run: Run): void | Promise<void> {
    this.logTrace(run, RunStatus.ERROR);
  }

  onRetrieverStart(run: Run): void | Promise<void> {
    return this.logTrace(run, RunStatus.START);
  }
  onRetrieverEnd(run: Run): void | Promise<void> {
    this.logTrace(run, RunStatus.END);
  }
  onRetrieverError(run: Run): void | Promise<void> {
    this.logTrace(run, RunStatus.ERROR);
  }

  onAgentAction(run: Run): void | Promise<void> {
    this.logTrace(run, RunStatus.START);
  }
  onAgentEnd(run: Run): void | Promise<void> {
    this.logTrace(run, RunStatus.END);
  }
}
