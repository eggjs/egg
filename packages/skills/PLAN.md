# Skills 评测方案设计

## 目标

为 `packages/skills/` 设计一套评测体系，覆盖两个层面：

1. **静态校验** — 验证 Skill 文件的结构正确性、引用完整性
2. **动态评测** — 用 LLM-as-Judge 评估 AI 基于 Skill 生成回答的质量

全部手动触发运行，不集成 CI。

---

## 目录结构

```
packages/skills/
├── egg/
├── controller/
├── tegg-core/
├── eval/                          # 新增：评测目录
│   ├── static/
│   │   └── validate.test.ts       # 静态校验测试
│   ├── dynamic/
│   │   ├── routing.eval.ts        # 入口路由评测
│   │   └── quality.eval.ts        # 内容质量评测
│   ├── fixtures/
│   │   ├── routing-cases.ts       # 路由测试用例
│   │   └── quality-cases.ts       # 质量测试用例
│   └── lib/
│       ├── skill-loader.ts        # Skill 文件加载器
│       ├── judge.ts               # LLM-as-Judge 核心逻辑
│       └── types.ts               # 共享类型定义
├── vitest.config.ts
├── package.json
└── tsconfig.json
```

---

## 第一部分：静态校验

### 校验项

| 校验项               | 说明                                                          |
| -------------------- | ------------------------------------------------------------- |
| **Frontmatter 格式** | 每个 SKILL.md 必须包含 `name`、`description`、`allowed-tools` |
| **引用文件存在性**   | SKILL.md 中提到的 `references/*.md` 文件必须存在              |
| **交叉引用一致性**   | 入口 skill 提到的子 skill 目录必须存在且包含 SKILL.md         |
| **Markdown 结构**    | 标题层级合理（以 `# ` 开头，不跳级）                          |
| **决策表完整性**     | 入口 skill 的路由表中每个 skill 都有对应目录                  |

### 实现方式

使用 vitest + node:assert 编写测试，通过 Node.js fs API 读取文件并解析：

```typescript
// eval/static/validate.test.ts
import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { loadAllSkills } from '../lib/skill-loader.ts';

describe('Skill 静态校验', () => {
  describe('Frontmatter', () => {
    it('每个 SKILL.md 包含必填字段: name, description, allowed-tools', ...);
  });

  describe('引用完整性', () => {
    it('SKILL.md 中引用的 references/ 文件均存在', ...);
    it('入口 skill 引用的子 skill 目录均存在', ...);
  });

  describe('Markdown 结构', () => {
    it('标题层级不跳级', ...);
  });
});
```

---

## 第二部分：动态评测（LLM-as-Judge）

### 评测维度

动态评测分为两个子场景：

#### 2.1 路由评测 — 入口 Skill 是否正确路由

测试 `egg/SKILL.md` 的决策逻辑：给定用户查询，判断 AI 是否路由到正确的子 skill。

**测试用例结构：**

```typescript
// eval/fixtures/routing-cases.ts
export const routingCases: RoutingCase[] = [
  {
    query: '如何创建 HTTP controller？',
    expectedSkill: 'controller',
    reason: '明确提到 controller，属于协议实现',
  },
  {
    query: '@SingletonProto 和 @ContextProto 有什么区别？',
    expectedSkill: 'tegg-core',
    reason: '关于对象生命周期，属于核心概念',
  },
  {
    query: '我需要创建一个可以被 HTTP 控制器使用的服务',
    expectedSkill: 'tegg-core',
    reason: '模糊意图，按规则 1（基础优先）应路由到 core',
  },
  // ... 更多用例
];
```

**测试实现：**

```typescript
// eval/dynamic/routing.eval.ts
import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import { loadSkillContent } from '../lib/skill-loader.ts';
import { routingCases } from '../fixtures/routing-cases.ts';

const client = new Anthropic();
const AVAILABLE_SKILLS = ['controller', 'tegg-core'];

describe('路由评测', () => {
  // 加载入口 skill 作为 system prompt
  const entrySkillContent = loadSkillContent('egg');

  for (const { query, expectedSkill, reason } of routingCases) {
    it(`"${query}" → ${expectedSkill}`, async () => {
      // 1. 将 SKILL.md 作为 system prompt，发送用户查询
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: [
          entrySkillContent,
          // 约束输出格式，让 AI 只做路由决策
          `你是 EGG 框架技能路由器。根据上面的决策指南，分析用户查询并选择应该加载的技能。`,
          `可选技能: ${AVAILABLE_SKILLS.join(', ')}`,
          `只输出 JSON: {"skill": "<技能名>", "reason": "<简要理由>"}`,
        ].join('\n\n'),
        messages: [{ role: 'user', content: query }],
      });

      // 2. 解析 AI 回答中的路由选择
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const parsed = JSON.parse(text);

      // 3. 断言路由正确性
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
```

#### 2.2 内容质量评测 — 子 Skill 回答质量

测试各子 skill 对领域问题的回答质量。

**测试用例结构：**

```typescript
// eval/fixtures/quality-cases.ts
export const qualityCases: QualityCase[] = [
  {
    skill: 'controller',
    query: '如何创建一个 POST 接口接收 JSON body？',
    criteria: [
      '使用 @HTTPController 装饰器',
      '使用 @HTTPMethod 且 method 为 POST',
      '使用 @HTTPBody() 获取请求体',
      '包含完整可运行的代码示例',
    ],
    references: ['references/http-controller.md'], // 需要加载的参考文档
  },
  {
    skill: 'tegg-core',
    query: '如何让一个服务可以被其他模块访问？',
    criteria: ['提到 AccessLevel.PUBLIC', '使用 @SingletonProto 装饰器', '解释跨模块访问机制'],
    references: [],
  },
  // ... 更多用例
];
```

**测试实现：**

```typescript
// eval/dynamic/quality.eval.ts
import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import { loadSkillContent, loadReference } from '../lib/skill-loader.ts';
import { qualityCases } from '../fixtures/quality-cases.ts';
import { judge } from '../lib/judge.ts';

const client = new Anthropic();

describe('内容质量评测', () => {
  for (const testCase of qualityCases) {
    describe(`[${testCase.skill}] ${testCase.query}`, () => {
      let aiResponse: string;

      // Step 1: 加载 skill 内容作为 system prompt，向被测 LLM 提问
      it('生成回答', async () => {
        const skillContent = loadSkillContent(testCase.skill);
        const refContents = testCase.references.map((ref) => loadReference(testCase.skill, ref));

        const systemPrompt = [skillContent, ...refContents].join('\n\n---\n\n');

        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: testCase.query }],
        });

        aiResponse = response.content[0].type === 'text' ? response.content[0].text : '';
        assert.ok(aiResponse.length > 0, 'AI 应该返回非空回答');
      });

      // Step 2: 用 Judge LLM 对回答逐项评分
      it('通过质量评审', async () => {
        const result = await judge(client, {
          query: testCase.query,
          response: aiResponse,
          criteria: testCase.criteria,
        });

        // 输出详细评分到 console 供人工查看
        console.log(`    得分: ${result.totalScore} (${result.passed}/${result.total})`);
        for (const item of result.details) {
          const icon = item.score === 1 ? '✓' : '✗';
          console.log(`      ${icon} ${item.criterion}: ${item.reason}`);
        }

        // 断言：所有 criteria 都应满足
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
```

### LLM-as-Judge 实现

```typescript
// eval/lib/judge.ts
import type Anthropic from '@anthropic-ai/sdk';
import type { JudgeInput, JudgeResult, JudgeDetail } from './types.ts';

export async function judge(client: Anthropic, input: JudgeInput): Promise<JudgeResult> {
  const criteriaList = input.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: '你是 AI 回答质量评估专家。严格按照 JSON 格式输出评分结果。',
    messages: [
      {
        role: 'user',
        content: `请根据评分标准，对以下 AI 回答逐项评分。

## 评分标准
${criteriaList}

## 用户问题
${input.query}

## AI 回答
${input.response}

## 输出格式（严格 JSON）
{
  "details": [
    { "criterion": "标准内容", "score": 0 或 1, "reason": "简要理由" }
  ]
}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const parsed = JSON.parse(text);
  const details: JudgeDetail[] = parsed.details;
  const passed = details.filter((d) => d.score === 1).length;

  return {
    details,
    passed,
    total: details.length,
    totalScore: passed / details.length,
  };
}
```

### 评测报告

运行评测后生成 JSON 报告：

```json
{
  "timestamp": "2026-02-05T10:00:00Z",
  "routing": {
    "total": 10,
    "correct": 9,
    "accuracy": 0.9,
    "failures": [
      {
        "query": "...",
        "expected": "tegg-core",
        "actual": "controller",
        "reason": "..."
      }
    ]
  },
  "quality": {
    "controller": {
      "cases": 5,
      "avg_score": 0.85,
      "details": [...]
    },
    "tegg-core": {
      "cases": 5,
      "avg_score": 0.90,
      "details": [...]
    }
  }
}
```

---

## 第三部分：技术选型与依赖

| 组件                  | 选型               | 理由                           |
| --------------------- | ------------------ | ------------------------------ |
| 测试框架              | vitest             | 遵循 monorepo 标准             |
| 断言库                | node:assert/strict | Node.js 内置，零依赖           |
| YAML frontmatter 解析 | gray-matter        | 成熟的 frontmatter 解析库      |
| LLM 调用              | @anthropic-ai/sdk  | 使用 Claude API 做评测和 Judge |
| 报告输出              | JSON 文件          | 简单可读，方便后续扩展为可视化 |

### package.json scripts

```json
{
  "scripts": {
    "test": "vitest run --config vitest.config.ts eval/static/",
    "eval": "vitest run --config vitest.config.ts eval/dynamic/",
    "eval:routing": "vitest run --config vitest.config.ts eval/dynamic/routing.eval.ts",
    "eval:quality": "vitest run --config vitest.config.ts eval/dynamic/quality.eval.ts"
  }
}
```

- `test` — 运行静态校验（快速，无 API 调用）
- `eval` — 运行全部动态评测
- `eval:routing` — 仅运行路由评测
- `eval:quality` — 仅运行内容质量评测

动态评测需设置 `ANTHROPIC_API_KEY` 环境变量。

---

## 实施步骤

1. 在 worktree (`egg-skills-eval`) 中添加依赖：vitest、gray-matter、@anthropic-ai/sdk
2. 添加 `vitest.config.ts` 和更新 `package.json` scripts
3. 创建 `eval/lib/` 基础工具：skill-loader、types、judge
4. 实现 `eval/static/validate.test.ts` 静态校验
5. 编写路由测试用例 `eval/fixtures/routing-cases.ts`
6. 实现 `eval/dynamic/routing.eval.ts` 路由评测
7. 编写质量测试用例 `eval/fixtures/quality-cases.ts`
8. 实现 `eval/dynamic/quality.eval.ts` 内容质量评测
