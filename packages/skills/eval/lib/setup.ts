import fs from 'node:fs';
import path from 'node:path';

/** skills 源目录（packages/skills/） */
const SKILLS_SRC = path.resolve(import.meta.dirname, '..', '..');

/** 评测工作区目录 */
export const EVAL_WORKSPACE = path.resolve(import.meta.dirname, '..', 'workspace');

/** 工作区内的 skills 安装目录 */
const SKILLS_INSTALL_DIR = path.join(EVAL_WORKSPACE, '.claude', 'skills');

/** 需要排除的非 skill 目录 */
const EXCLUDE_DIRS = new Set(['eval', 'node_modules']);

/**
 * 发现 packages/skills/ 下的所有 skill 目录
 */
function discoverSkillSrcDirs(): string[] {
  const entries = fs.readdirSync(SKILLS_SRC, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !EXCLUDE_DIRS.has(e.name))
    .filter((e) => fs.existsSync(path.join(SKILLS_SRC, e.name, 'SKILL.md')))
    .map((e) => e.name);
}

/**
 * 初始化评测工作区：将 skills 通过 symlink 安装到 .claude/skills/ 下
 *
 * 结构：
 * eval/workspace/
 * └── .claude/
 *     └── skills/
 *         ├── egg/          → symlink → packages/skills/egg/
 *         ├── controller/   → symlink → packages/skills/controller/
 *         └── tegg-core/    → symlink → packages/skills/tegg-core/
 */
export function setupWorkspace(): void {
  // 清理旧的安装目录
  if (fs.existsSync(SKILLS_INSTALL_DIR)) {
    fs.rmSync(SKILLS_INSTALL_DIR, { recursive: true });
  }
  fs.mkdirSync(SKILLS_INSTALL_DIR, { recursive: true });

  const skillDirs = discoverSkillSrcDirs();
  for (const dir of skillDirs) {
    const src = path.join(SKILLS_SRC, dir);
    const dest = path.join(SKILLS_INSTALL_DIR, dir);
    fs.symlinkSync(src, dest, 'dir');
  }
}

/**
 * 安装指定的 skills 到工作区（用于单独测试特定 skill）
 */
export function setupWorkspaceWith(skillNames: string[]): void {
  if (fs.existsSync(SKILLS_INSTALL_DIR)) {
    fs.rmSync(SKILLS_INSTALL_DIR, { recursive: true });
  }
  fs.mkdirSync(SKILLS_INSTALL_DIR, { recursive: true });

  for (const dir of skillNames) {
    const src = path.join(SKILLS_SRC, dir);
    const dest = path.join(SKILLS_INSTALL_DIR, dir);
    if (fs.existsSync(src)) {
      fs.symlinkSync(src, dest, 'dir');
    }
  }
}

/**
 * 清理评测工作区
 */
export function cleanWorkspace(): void {
  if (fs.existsSync(EVAL_WORKSPACE)) {
    fs.rmSync(EVAL_WORKSPACE, { recursive: true });
  }
}
