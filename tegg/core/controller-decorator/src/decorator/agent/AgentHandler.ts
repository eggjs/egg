import type {
  ThreadObject,
  ThreadObjectWithMessages,
  CreateRunInput,
  RunObject,
  AgentStreamMessage,
} from '@eggjs/tegg-types/agent-runtime';

// Interface for AgentController classes. The `execRun` method is required —
// the framework uses it to auto-wire thread/run management, store persistence,
// SSE streaming, async execution, and cancellation via smart defaults.
export interface AgentHandler {
  execRun(input: CreateRunInput, signal?: AbortSignal): AsyncGenerator<AgentStreamMessage>;
  /** Create the AgentStore used to persist threads and runs. */
  createStore(): Promise<unknown>;
  createThread?(): Promise<ThreadObject>;
  getThread?(threadId: string): Promise<ThreadObjectWithMessages>;
  asyncRun?(input: CreateRunInput): Promise<RunObject>;
  streamRun?(input: CreateRunInput): Promise<void>;
  syncRun?(input: CreateRunInput): Promise<RunObject>;
  getRun?(runId: string): Promise<RunObject>;
  cancelRun?(runId: string): Promise<RunObject>;
}
