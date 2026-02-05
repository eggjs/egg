import assert from 'node:assert/strict';

import { describe, it, beforeAll, afterAll } from 'vitest';

import { routingCases } from '../fixtures/routing-cases.ts';
import { claudeChat } from '../lib/claude-cli.ts';
import { setupWorkspace, cleanWorkspace } from '../lib/setup.ts';

const AVAILABLE_SKILLS = ['controller', 'tegg-core'];

describe('路由评测', () => {
  beforeAll(() => {
    setupWorkspace();
  });

  afterAll(() => {
    cleanWorkspace();
  });

  for (const { query, expectedSkill, reason } of routingCases) {
    it(`"${query}" → ${expectedSkill}`, async () => {
      // 通过 append-system-prompt 要求输出路由决策 JSON
      // skills 会被 claude 自然发现和加载
      const text = await claudeChat(query, {
        appendSystemPrompt: [
          '你需要根据已安装的 skills 决定使用哪个 skill 来回答用户问题。',
          `可选技能: ${AVAILABLE_SKILLS.join(', ')}`,
          '只输出 JSON: {"skill": "<技能名>", "reason": "<简要理由>"}，不要输出其他内容。',
        ].join('\n'),
      });

      // 从 LLM 输出中提取第一个 JSON 对象，兼容裸 JSON、markdown 代码块、夹杂解释文字等情况
      const match = text.match(/\{[\s\S]*\}/);
      assert.ok(match, `未能从输出中提取 JSON:\n${text}`);

      const parsed = JSON.parse(match[0]) as { skill: string; reason: string };

      assert.equal(
        parsed.skill,
        expectedSkill,
        `路由错误: 期望 "${expectedSkill}" 但得到 "${parsed.skill}"` +
          `\n  用例理由: ${reason}` +
          `\n  AI 理由: ${parsed.reason}`,
      );
    });
  }
});
