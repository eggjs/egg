import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';

import type { LoadedSkill, SkillMeta } from './types.ts';

/** skills 根目录 */
const SKILLS_ROOT = path.resolve(import.meta.dirname, '..', '..');

/** 需要排除的非 skill 目录 */
const EXCLUDE_DIRS = new Set(['eval', 'node_modules']);

/**
 * 获取所有 skill 目录名（包含 SKILL.md 的子目录）
 */
export function discoverSkillDirs(): string[] {
  const entries = fs.readdirSync(SKILLS_ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !EXCLUDE_DIRS.has(e.name))
    .filter((e) => fs.existsSync(path.join(SKILLS_ROOT, e.name, 'SKILL.md')))
    .map((e) => e.name);
}

/**
 * 加载单个 skill 的 SKILL.md 内容
 */
export function loadSkill(skillDir: string): LoadedSkill {
  const skillPath = path.join(SKILLS_ROOT, skillDir);
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  const raw = fs.readFileSync(skillMdPath, 'utf-8');
  const { data, content } = matter(raw);

  return {
    dir: skillDir,
    meta: data as SkillMeta,
    content: content.trim(),
    path: skillPath,
  };
}

/**
 * 加载所有 skills
 */
export function loadAllSkills(): LoadedSkill[] {
  return discoverSkillDirs().map((dir) => loadSkill(dir));
}

/**
 * 加载 skill 的 SKILL.md 内容（纯文本，含 frontmatter）用作 system prompt
 */
export function loadSkillContent(skillDir: string): string {
  const skillMdPath = path.join(SKILLS_ROOT, skillDir, 'SKILL.md');
  return fs.readFileSync(skillMdPath, 'utf-8');
}

/**
 * 加载 skill 下的 reference 文件内容
 */
export function loadReference(skillDir: string, refPath: string): string {
  const fullPath = path.join(SKILLS_ROOT, skillDir, refPath);
  return fs.readFileSync(fullPath, 'utf-8');
}

/**
 * 列出 skill 目录下 references/ 中的所有 .md 文件
 */
export function listReferences(skillDir: string): string[] {
  const refsDir = path.join(SKILLS_ROOT, skillDir, 'references');
  if (!fs.existsSync(refsDir)) return [];

  return fs.readdirSync(refsDir).filter((f) => f.endsWith('.md'));
}

/**
 * 从 SKILL.md 内容中提取引用的 references 路径
 * 匹配 `references/*.md` 模式
 */
export function extractReferencePaths(content: string): string[] {
  const regex = /`references\/([^`]+\.md)`/g;
  const paths: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    paths.push(match[1]);
  }
  return [...new Set(paths)];
}
