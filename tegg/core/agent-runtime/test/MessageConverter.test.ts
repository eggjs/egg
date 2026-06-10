import assert from 'node:assert';

import type { AgentMessage, InputMessage, SDKResultMessage } from '@eggjs/tegg-types/agent-runtime';
import { describe, it } from 'vitest';

import { MessageConverter } from '../src/MessageConverter.ts';

describe('test/MessageConverter.test.ts', () => {
  describe('extractUsage', () => {
    it('should return undefined when no result messages', () => {
      const messages: AgentMessage[] = [
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] } },
        { type: 'user', message: { role: 'user', content: 'hello' } },
      ];
      const usage = MessageConverter.extractUsage(messages);
      assert.equal(usage, undefined);
    });

    it('should extract usage from a single result message', () => {
      const messages: AgentMessage[] = [
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] } },
        {
          type: 'result',
          subtype: 'success',
          usage: { input_tokens: 10, output_tokens: 5 },
        } as SDKResultMessage,
      ];
      const usage = MessageConverter.extractUsage(messages);
      assert.ok(usage);
      assert.equal(usage.promptTokens, 10);
      assert.equal(usage.completionTokens, 5);
      assert.equal(usage.totalTokens, 15);
    });

    it('should accumulate usage from multiple result messages', () => {
      const messages: AgentMessage[] = [
        {
          type: 'result',
          subtype: 'success',
          usage: { input_tokens: 10, output_tokens: 5 },
        } as SDKResultMessage,
        {
          type: 'result',
          subtype: 'success',
          usage: { input_tokens: 20, output_tokens: 8 },
        } as SDKResultMessage,
      ];
      const usage = MessageConverter.extractUsage(messages);
      assert.ok(usage);
      assert.equal(usage.promptTokens, 30);
      assert.equal(usage.completionTokens, 13);
      assert.equal(usage.totalTokens, 43);
    });

    it('should handle result message without usage field', () => {
      const messages: AgentMessage[] = [{ type: 'result', subtype: 'success' } as SDKResultMessage];
      const usage = MessageConverter.extractUsage(messages);
      assert.equal(usage, undefined);
    });

    it('should handle empty messages array', () => {
      const usage = MessageConverter.extractUsage([]);
      assert.equal(usage, undefined);
    });

    it('should handle partial usage fields (missing output_tokens)', () => {
      const messages: AgentMessage[] = [
        {
          type: 'result',
          subtype: 'success',
          usage: { input_tokens: 10 },
        } as SDKResultMessage,
      ];
      const usage = MessageConverter.extractUsage(messages);
      assert.ok(usage);
      assert.equal(usage.promptTokens, 10);
      assert.equal(usage.completionTokens, 0);
      assert.equal(usage.totalTokens, 10);
    });

    it('should handle cache-related usage fields', () => {
      const messages: AgentMessage[] = [
        {
          type: 'result',
          subtype: 'success',
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_creation_input_tokens: 200,
            cache_read_input_tokens: 80,
          },
        } as SDKResultMessage,
      ];
      const usage = MessageConverter.extractUsage(messages);
      assert.ok(usage);
      assert.equal(usage.promptTokens, 100);
      assert.equal(usage.completionTokens, 50);
      assert.equal(usage.totalTokens, 150);
    });
  });

  describe('filterForStorage', () => {
    it('should filter out stream_event messages', () => {
      const messages: AgentMessage[] = [
        { type: 'system', subtype: 'init', session_id: 'sess-1' },
        { type: 'user', message: { role: 'user', content: 'hello' } },
        { type: 'stream_event', event: { type: 'content_block_delta' }, session_id: 'sess-1' },
        { type: 'stream_event', event: { type: 'content_block_delta' }, session_id: 'sess-1' },
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] } },
        { type: 'result', subtype: 'success', usage: { input_tokens: 10, output_tokens: 5 } } as SDKResultMessage,
      ];
      const result = MessageConverter.filterForStorage(messages);
      assert.equal(result.length, 4);
      assert.equal(result[0].type, 'system');
      assert.equal(result[1].type, 'user');
      assert.equal(result[2].type, 'assistant');
      assert.equal(result[3].type, 'result');
    });

    it('should return all messages when no stream_event present', () => {
      const messages: AgentMessage[] = [
        { type: 'user', message: { role: 'user', content: 'hello' } },
        { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] } },
      ];
      const result = MessageConverter.filterForStorage(messages);
      assert.equal(result.length, 2);
    });

    it('should handle empty array', () => {
      const result = MessageConverter.filterForStorage([]);
      assert.deepStrictEqual(result, []);
    });
  });

  describe('toAgentMessages', () => {
    it('should convert user messages to AgentMessage format', () => {
      const messages: InputMessage[] = [{ role: 'user', content: 'hello' }];
      const result = MessageConverter.toAgentMessages(messages);
      assert.equal(result.length, 1);
      assert.equal(result[0].type, 'user');
      assert.deepStrictEqual((result[0] as any).message, { role: 'user', content: 'hello' });
    });

    it('should filter out system messages', () => {
      const messages: InputMessage[] = [
        { role: 'system', content: 'you are a bot' },
        { role: 'user', content: 'hello' },
      ];
      const result = MessageConverter.toAgentMessages(messages);
      assert.equal(result.length, 1);
      assert.equal(result[0].type, 'user');
    });

    it('should handle array content', () => {
      const messages: InputMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'part1' },
            { type: 'text', text: 'part2' },
          ],
        },
      ];
      const result = MessageConverter.toAgentMessages(messages);
      assert.equal(result.length, 1);
      assert.deepStrictEqual((result[0] as any).message.content, [
        { type: 'text', text: 'part1' },
        { type: 'text', text: 'part2' },
      ]);
    });

    it('should handle empty array', () => {
      const result = MessageConverter.toAgentMessages([]);
      assert.deepStrictEqual(result, []);
    });

    it('should preserve assistant role messages with correct type', () => {
      const messages: InputMessage[] = [{ role: 'assistant', content: 'I said something' }];
      const result = MessageConverter.toAgentMessages(messages);
      assert.equal(result.length, 1);
      assert.equal(result[0].type, 'assistant');
      assert.deepStrictEqual((result[0] as any).message.role, 'assistant');
    });
  });
});
