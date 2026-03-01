// AgentController decorator from controller-decorator (no wrapper needed)
export { AgentController } from '@eggjs/controller-decorator';

// Utility types and classes from agent-runtime
export type { AgentStore, ThreadRecord, RunRecord } from '@eggjs/agent-runtime';
export { AgentNotFoundError, AgentConflictError, FileAgentStore } from '@eggjs/agent-runtime';

// Original types and interfaces from controller-decorator
export type { AgentHandler } from '@eggjs/controller-decorator';
export type {
  // Input types
  InputMessage,
  InputContentPart,
  // Output types (OpenAI-aligned)
  MessageObject,
  MessageContentBlock,
  TextContentBlock,
  MessageDeltaObject,
  ThreadObject,
  ThreadObjectWithMessages,
  RunObject,
  RunStatus,
  // Internal types
  AgentRunConfig,
  AgentRunUsage,
  // Request types
  CreateRunInput,
  // Stream types
  AgentStreamMessage,
} from '@eggjs/controller-decorator';
