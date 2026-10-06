import type {
  ThreadObject,
  ThreadObjectWithMessages,
  CreateRunInput,
  RunObject,
  AgentMessage,
} from '@eggjs/tegg-types/agent-runtime';

// Interface for AgentController classes. The `execRun` method is required —
// the framework uses it to auto-wire thread/run management, store persistence,
// SSE streaming, async execution, and cancellation via smart defaults.
export interface AgentHandler {
  execRun(input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentMessage>;
  /** Create the AgentStore used to persist threads and runs. */
  createStore(): Promise<unknown>;
  /**
   * Optional hook to decide whether the executor's underlying session has
   * been committed to persistent storage (for example the Claude Code SDK
   * jsonl file on disk). The runtime calls this each time a new message is
   * yielded from `execRun`; once it returns true, `cancelRun` is allowed to
   * abort and persist the thread.
   *
   * When not implemented, the runtime uses a default heuristic: any message
   * with `type !== 'system'` counts as committed (covers the Claude Code SDK
   * case where `system/init` is emitted before the session is fully written).
   */
  isSessionCommitted?(msg: AgentMessage, history: AgentMessage[]): boolean | Promise<boolean>;
  createThread?(): Promise<ThreadObject>;
  getThread?(threadId: string): Promise<ThreadObjectWithMessages>;
  getLatestRunId?(threadId: string): Promise<{ threadId: string; runId: string | null }>;
  asyncRun?(input: CreateRunInput): Promise<RunObject>;
  streamRun?(input: CreateRunInput): Promise<void>;
  syncRun?(input: CreateRunInput): Promise<RunObject>;
  getRun?(runId: string): Promise<RunObject>;
  cancelRun?(runId: string): Promise<RunObject>;
}
