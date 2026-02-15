/** 路由评测用例 */
export interface RoutingCase {
  /** 用户查询 */
  query: string;
  /** 期望路由到的 skill 名称 */
  expectedSkill: string;
  /** 用例理由说明 */
  reason: string;
}

/** 质量评测用例 */
export interface QualityCase {
  /** 目标 skill 名称 */
  skill: string;
  /** 用户查询 */
  query: string;
  /** 评分标准列表 */
  criteria: string[];
  /** 需要额外加载的 reference 文件路径（相对于 skill 目录） */
  references: string[];
}

/** Judge 输入 */
export interface JudgeInput {
  query: string;
  response: string;
  criteria: string[];
}

/** Judge 单项评分 */
export interface JudgeDetail {
  criterion: string;
  score: 0 | 1;
  reason: string;
}

/** Judge 评分结果 */
export interface JudgeResult {
  details: JudgeDetail[];
  passed: number;
  total: number;
  totalScore: number;
}

/** Skill 元数据（SKILL.md frontmatter） */
export interface SkillMeta {
  name: string;
  description: string;
  'allowed-tools': string;
  [key: string]: unknown;
}

/** 加载后的 Skill */
export interface LoadedSkill {
  /** skill 目录名 */
  dir: string;
  /** frontmatter 元数据 */
  meta: SkillMeta;
  /** SKILL.md body 内容（去除 frontmatter） */
  content: string;
  /** skill 目录的绝对路径 */
  path: string;
}
