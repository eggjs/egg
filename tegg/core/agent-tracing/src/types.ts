// Claude SDK Message Types

export interface ClaudeTextContent {
  type: 'text';
  text: string;
}

export interface ClaudeToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input?: Record<string, any>;
}

export interface ClaudeToolResultContent {
  type: 'tool_result';
  content: string | ClaudeToolResultContent[];
  tool_use_id: string;
  is_error?: boolean;
}

export type ClaudeContentBlock = ClaudeTextContent | ClaudeToolUseContent | ClaudeToolResultContent;

export interface ClaudeTokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  server_tool_use?: {
    web_search_requests?: number;
    web_fetch_requests?: number;
  };
  service_tier?: string;
  cache_creation?: {
    ephemeral_1h_input_tokens?: number;
    ephemeral_5m_input_tokens?: number;
  };
}

export interface ClaudeMessageContent {
  id?: string;
  type?: string;
  role?: string;
  content?: ClaudeContentBlock[];
  model?: string;
  usage?: ClaudeTokenUsage;
  context_management?: any;
  stop_reason?: string;
  stop_sequence?: string;
  container?: any;
  [key: string]: any;
}

export interface ClaudeModelUsage {
  [modelName: string]: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
    webSearchRequests?: number;
    costUSD?: number;
    contextWindow?: number;
    maxOutputTokens?: number;
  };
}

export interface ClaudeMessage {
  type: 'system' | 'assistant' | 'user' | 'result';
  subtype?: 'init' | 'success' | 'error';
  session_id?: string;
  uuid: string;
  message?: ClaudeMessageContent;

  // System/init message fields
  cwd?: string;
  tools?: string[];
  mcp_servers?: Array<{ name: string; status: string }>;
  model?: string;
  permissionMode?: string;
  slash_commands?: string[];
  apiKeySource?: string;
  claude_code_version?: string;
  output_style?: string;
  agents?: string[];
  skills?: any[];
  plugins?: any[];

  // Result message fields
  is_error?: boolean;
  duration_ms?: number;
  duration_api_ms?: number;
  num_turns?: number;
  result?: string;
  total_cost_usd?: number;
  usage?: ClaudeTokenUsage;
  modelUsage?: ClaudeModelUsage;
  permission_denials?: any[];

  // User message fields (tool results)
  parent_tool_use_id?: string | null;
  tool_use_id?: string;
  tool_use_result?: string;

  // Error fields
  error?: string;

  [key: string]: any;
}

// Shared tracing types (from LangGraphTracer)

export interface IResource {
  compress: 'none' | 'gzip';
  key: string;
}

export interface IRunCost {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  totalCost?: number;
}

const FIELDS_TO_OSS = ['inputs', 'outputs', 'attachments', 'serialized', 'events'] as const;

export const RunStatus = {
  START: 'start',
  END: 'end',
  ERROR: 'error',
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

/** User-facing config passed to tracer.configure() */
export interface TracerConfig {
  agentName?: string;
}

/** Apply user-facing TracerConfig to a tracer instance. */
export function applyTracerConfig(tracer: { agentName: string }, config: TracerConfig): void {
  if (config.agentName !== undefined) {
    tracer.agentName = config.agentName;
  }
}

export { FIELDS_TO_OSS };
