import assert from 'node:assert/strict';

import { describe, it, beforeAll, afterAll } from 'vitest';

import { qualityCases } from '../fixtures/quality-cases.ts';
import { claudeChat } from '../lib/claude-cli.ts';
import { judge } from '../lib/judge.ts';
import { setupWorkspace, cleanWorkspace } from '../lib/setup.ts';

describe('内容质量评测', () => {
  beforeAll(() => {
    setupWorkspace();
  });

  afterAll(() => {
    cleanWorkspace();
  });

  for (const testCase of qualityCases) {
    describe(`[${testCase.skill}] ${testCase.query}`, () => {
      let aiResponse: string;

      it('生成回答', async () => {
        // 直接发送用户查询，skills 自然加载
        aiResponse = await claudeChat(testCase.query);
        assert.ok(aiResponse.length > 0, 'AI 应该返回非空回答');
      });

      it('通过质量评审', async () => {
        const result = await judge({
          query: testCase.query,
          response: aiResponse,
          criteria: testCase.criteria,
        });

        // 输出详细评分供人工查看
        console.log(`    得分: ${result.totalScore} (${result.passed}/${result.total})`);
        for (const item of result.details) {
          const icon = item.score === 1 ? '  ✓' : '  ✗';
          console.log(`    ${icon} ${item.criterion}: ${item.reason}`);
        }

        assert.ok(
          result.totalScore >= 0.8,
          `质量不达标: ${result.totalScore} < 0.8\n` +
            result.details
              .filter((d) => d.score === 0)
              .map((d) => `  ✗ ${d.criterion}: ${d.reason}`)
              .join('\n'),
        );
      });
    });
  }
});
