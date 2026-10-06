// ===== Input content types (for CreateRunInput) =====

export interface TextInputContentPart {
  type: 'text';
  text: string;
}

export interface ToolUseInputContentPart {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultInputContentPart {
  type: 'tool_result';
  tool_use_id: string;
  content?: string | { type: string; text?: string; [key: string]: unknown }[];
  is_error?: boolean;
}

export interface GenericInputContentPart {
  type: string;
  [key: string]: unknown;
}

export type InputContentPart =
  | TextInputContentPart
  | ToolUseInputContentPart
  | ToolResultInputContentPart
  | GenericInputContentPart;

// ===== Input message (for CreateRunInput) =====

export interface InputMessage {
  role: string;
  content: string | InputContentPart[];
  metadata?: Record<string, unknown>;
}

// ===== AgentMessage — aligned with Claude Agent SDK SDKMessage =====
// Lightweight subset of SDK message types. The framework only needs to
// discriminate on `type` for a handful of core message kinds; everything
// else passes through as SDKGenericMessage.

export interface SDKSystemMessage {
  type: 'system';
  subtype: string;
  session_id?: string;
  [key: string]: unknown;
}

export interface SDKStreamEvent {
  type: 'stream_event';
  event: unknown;
  session_id?: string;
  [key: string]: unknown;
}

export interface SDKUserMessage {
  type: 'user';
  message: unknown;
  [key: string]: unknown;
}

export interface SDKAssistantMessage {
  type: 'assistant';
  message: unknown;
  [key: string]: unknown;
}

export interface SDKResultMessage {
  type: 'result';
  subtype: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SDKGenericMessage {
  type: string;
  [key: string]: unknown;
}

export type AgentMessage =
  | SDKSystemMessage
  | SDKStreamEvent
  | SDKUserMessage
  | SDKAssistantMessage
  | SDKResultMessage
  | SDKGenericMessage;
