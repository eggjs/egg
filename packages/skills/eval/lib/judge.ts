import { claudePlain } from './claude-cli.ts';
import type { JudgeInput, JudgeResult, JudgeDetail } from './types.ts';

/**
 * 使用 LLM-as-Judge 对 AI 回答进行逐项评分
 * 通过 claudePlain（禁用 skills）调用，避免 skill 干扰评分
 */
export async function judge(input: JudgeInput): Promise<JudgeResult> {
  const criteriaList = input.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n');

  const text = await claudePlain(
    `请根据评分标准，对以下 AI 回答逐项评分。

## 评分标准
${criteriaList}

## 用户问题
${input.query}

## AI 回答
${input.response}

## 输出格式（严格 JSON，不要包含 markdown 代码块标记）
{
  "details": [
    { "criterion": "标准内容", "score": 0, "reason": "简要理由" }
  ]
}`,
    '你是 AI 回答质量评估专家。严格按照 JSON 格式输出评分结果，不要输出其他内容。',
  );

  // 从 LLM 输出中提取第一个 JSON 对象，兼容裸 JSON、markdown 代码块、夹杂解释文字等情况
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`未能从 Judge 输出中提取 JSON:\n${text}`);
  }
  const parsed = JSON.parse(match[0]) as { details: JudgeDetail[] };
  const details = parsed.details;
  const passed = details.filter((d) => d.score === 1).length;

  return {
    details,
    passed,
    total: details.length,
    totalScore: details.length > 0 ? passed / details.length : 0,
  };
}
