import assert from 'node:assert';

import type {
  AgentStreamMessage,
  AgentStreamMessagePayload,
  MessageContentBlock,
} from '@eggjs/tegg-types/agent-runtime';
import { MessageRole, MessageStatus, AgentObjectType, ContentBlockType } from '@eggjs/tegg-types/agent-runtime';
import { describe, it } from 'vitest';

import { MessageConverter } from '../src/MessageConverter.ts';

describe('test/MessageConverter.test.ts', () => {
  describe('toContentBlocks', () => {
    it('should return empty array for falsy payload', () => {
      const result = MessageConverter.toContentBlocks(undefined as unknown as AgentStreamMessagePayload);
      assert.deepStrictEqual(result, []);
    });

    it('should convert string content to a single text block', () => {
      const payload: AgentStreamMessagePayload = { content: 'hello world' };
      const result = MessageConverter.toContentBlocks(payload);
      assert.equal(result.length, 1);
      assert.equal(result[0].type, ContentBlockType.Text);
      assert.equal(result[0].text.value, 'hello world');
      assert.deepStrictEqual(result[0].text.annotations, []);
    });

    it('should convert array content parts to text blocks', () => {
      const payload: AgentStreamMessagePayload = {
        content: [
          { type: 'text', text: 'part1' },
          { type: 'text', text: 'part2' },
        ],
      };
      const result = MessageConverter.toContentBlocks(payload);
      assert.equal(result.length, 2);
      assert.equal(result[0].text.value, 'part1');
      assert.equal(result[1].text.value, 'part2');
    });

    it('should filter out non-text content parts', () => {
      const payload: AgentStreamMessagePayload = {
        content: [
          { type: 'text', text: 'keep' },
          { type: 'image' as 'text', text: 'discard' },
        ],
      };
      const result = MessageConverter.toContentBlocks(payload);
      assert.equal(result.length, 1);
      assert.equal(result[0].text.value, 'keep');
    });

    it('should return empty array for non-string non-array content', () => {
      const payload = { content: 123 } as unknown as AgentStreamMessagePayload;
      const result = MessageConverter.toContentBlocks(payload);
      assert.deepStrictEqual(result, []);
    });
  });

  describe('toMessageObject', () => {
    it('should create a completed assistant message', () => {
      const payload: AgentStreamMessagePayload = { content: 'reply' };
      const msg = MessageConverter.toMessageObject(payload, 'run_1');

      assert.ok(msg.id.startsWith('msg_'));
      assert.equal(msg.object, AgentObjectType.ThreadMessage);
      assert.equal(msg['run_id'], 'run_1');
      assert.equal(msg['role'], MessageRole.Assistant);
      assert.equal(msg['status'], MessageStatus.Completed);
      assert.equal(typeof msg.created_at, 'number');
      const content = msg['content'] as MessageContentBlock[];
      assert.equal(content.length, 1);
      assert.equal(content[0].text.value, 'reply');
    });

    it('should work without runId', () => {
      const payload: AgentStreamMessagePayload = { content: 'test' };
      const msg = MessageConverter.toMessageObject(payload);
      assert.equal(msg['run_id'], undefined);
    });
  });

  describe('createStreamMessage', () => {
    it('should create an in-progress message with empty content', () => {
      const msg = MessageConverter.createStreamMessage('msg_abc', 'run_1');

      assert.equal(msg.id, 'msg_abc');
      assert.equal(msg.object, AgentObjectType.ThreadMessage);
      assert.equal(msg['run_id'], 'run_1');
      assert.equal(msg['role'], MessageRole.Assistant);
      assert.equal(msg['status'], MessageStatus.InProgress);
      assert.deepStrictEqual(msg['content'], []);
      assert.equal(typeof msg.created_at, 'number');
    });
  });

  describe('extractFromStreamMessages', () => {
    it('should extract messages and accumulate usage', () => {
      const messages: AgentStreamMessage[] = [
        { message: { content: 'chunk1' }, usage: { prompt_tokens: 10, completion_tokens: 5 } },
        { message: { content: 'chunk2' }, usage: { prompt_tokens: 0, completion_tokens: 8 } },
      ];
      const { output, usage } = MessageConverter.extractFromStreamMessages(messages, 'run_1');

      assert.equal(output.length, 2);
      assert.equal((output[0]['content'] as MessageContentBlock[])[0].text.value, 'chunk1');
      assert.equal((output[1]['content'] as MessageContentBlock[])[0].text.value, 'chunk2');
      assert.ok(usage);
      assert.equal(usage.promptTokens, 10);
      assert.equal(usage.completionTokens, 13);
      assert.equal(usage.totalTokens, 23);
    });

    it('should return undefined usage when no usage info', () => {
      const messages: AgentStreamMessage[] = [{ message: { content: 'data' } }];
      const { output, usage } = MessageConverter.extractFromStreamMessages(messages);
      assert.equal(output.length, 1);
      assert.equal(usage, undefined);
    });

    it('should handle messages without message payload (usage only)', () => {
      const messages: AgentStreamMessage[] = [{ usage: { prompt_tokens: 5, completion_tokens: 3 } }];
      const { output, usage } = MessageConverter.extractFromStreamMessages(messages);
      assert.equal(output.length, 0);
      assert.ok(usage);
      assert.equal(usage.totalTokens, 8);
    });

    it('should handle empty message array', () => {
      const { output, usage } = MessageConverter.extractFromStreamMessages([]);
      assert.equal(output.length, 0);
      assert.equal(usage, undefined);
    });
  });

  describe('toInputMessageObjects', () => {
    it('should convert user and assistant messages', () => {
      const messages = [
        { role: MessageRole.User as MessageRole, content: 'hi' },
        { role: MessageRole.Assistant as MessageRole, content: 'hello' },
      ];
      const result = MessageConverter.toInputMessageObjects(messages, 'thread_1');

      assert.equal(result.length, 2);
      assert.equal(result[0]['role'], MessageRole.User);
      assert.equal(result[0]['thread_id'], 'thread_1');
      assert.equal(result[1]['role'], MessageRole.Assistant);

      const content0 = result[0]['content'] as MessageContentBlock[];
      assert.equal(content0[0].text.value, 'hi');
    });

    it('should filter out system messages', () => {
      const messages = [
        { role: MessageRole.System as MessageRole, content: 'you are a bot' },
        { role: MessageRole.User as MessageRole, content: 'hi' },
      ];
      const result = MessageConverter.toInputMessageObjects(messages);
      assert.equal(result.length, 1);
      assert.equal(result[0]['role'], MessageRole.User);
    });

    it('should handle array content parts', () => {
      const messages = [
        {
          role: MessageRole.User as MessageRole,
          content: [
            { type: 'text' as const, text: 'part1' },
            { type: 'text' as const, text: 'part2' },
          ],
        },
      ];
      const result = MessageConverter.toInputMessageObjects(messages);
      const content = result[0]['content'] as MessageContentBlock[];
      assert.equal(content.length, 2);
      assert.equal(content[0].text.value, 'part1');
      assert.equal(content[1].text.value, 'part2');
    });

    it('should work without threadId', () => {
      const messages = [{ role: MessageRole.User as MessageRole, content: 'hi' }];
      const result = MessageConverter.toInputMessageObjects(messages);
      assert.equal(result[0]['thread_id'], undefined);
    });
  });
});
