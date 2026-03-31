import assert from 'node:assert';

import { ChatModelQualifierAttribute } from '@eggjs/langchain-decorator';
import type { ObjectInfo, ModuleConfig } from '@eggjs/tegg';

export type ConfigTypeHelper = any;

export function getClientNames(config: ModuleConfig | undefined, key: string): string[] {
  const clients = (config as any)?.[key]?.clients;
  if (!clients) return [];
  return Object.keys(clients);
}

export function getChatModelConfig(config: ModuleConfig, objectInfo: ObjectInfo): any {
  const chatModelName = objectInfo.qualifiers.find((t) => t.attribute === ChatModelQualifierAttribute)?.value;
  assert(chatModelName, 'not found ChatModel name');
  const chatModelConfig = (config as any).ChatModel?.clients[chatModelName];
  if (!chatModelConfig) {
    throw new Error(`not found ChatModel config for ${chatModelName}`);
  }
  return chatModelConfig!;
}
