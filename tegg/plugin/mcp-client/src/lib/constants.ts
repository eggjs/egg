export const McpMethod = {
  INITIALIZE: 'initialize',
  NOTIFICATION_INIT: 'notifications/initialized',
  LIST_TOOLS: 'tools/list',
  CALL_TOOLS: 'tools/call',
  LIST_PROMPTS: 'prompts/list',
  LIST_RESOURCES: 'resources/list',
} as const;
export type McpMethod = (typeof McpMethod)[keyof typeof McpMethod];
