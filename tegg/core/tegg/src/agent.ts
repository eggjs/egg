// AgentController decorator from controller-decorator
export { AgentController } from '@eggjs/controller-decorator';
export type { AgentHandler } from '@eggjs/controller-decorator';

// Implementation classes from agent-runtime
export { AgentNotFoundError, AgentConflictError, HttpSSEWriter } from '@eggjs/agent-runtime';

// Types (re-exported from agent-runtime, which re-exports @eggjs/tegg-types)
export type {
  AgentStore,
  ThreadRecord,
  RunRecord,
  CreateRunInput,
  RunObject,
  ThreadObject,
  ThreadObjectWithMessages,
  InputMessage,
  InputContentPart,
  TextInputContentPart,
  ToolUseInputContentPart,
  ToolResultInputContentPart,
  GenericInputContentPart,
  AgentRunConfig,
  GetThreadOptions,
  RunStatus,
  // SDK-aligned message types
  AgentMessage,
  SDKSystemMessage,
  SDKStreamEvent,
  SDKUserMessage,
  SDKAssistantMessage,
  SDKResultMessage,
  SDKGenericMessage,
} from '@eggjs/agent-runtime';
