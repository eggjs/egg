import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { describe, it } from 'vitest';

import {
  loadAllSkills,
  loadSkill,
  discoverSkillDirs,
  extractReferencePaths,
  listReferences,
} from '../lib/skill-loader.ts';

const skills = loadAllSkills();
const skillDirs = discoverSkillDirs();

describe('Skill 静态校验', () => {
  describe('Frontmatter 格式', () => {
    for (const skill of skills) {
      describe(`[${skill.dir}]`, () => {
        it('包含 name 字段', () => {
          assert.ok(skill.meta.name, `SKILL.md 缺少 name 字段`);
          assert.equal(typeof skill.meta.name, 'string');
        });

        it('包含 description 字段', () => {
          assert.ok(skill.meta.description, `SKILL.md 缺少 description 字段`);
          assert.equal(typeof skill.meta.description, 'string');
        });

        it('包含 allowed-tools 字段', () => {
          assert.ok(skill.meta['allowed-tools'], `SKILL.md 缺少 allowed-tools 字段`);
          assert.equal(typeof skill.meta['allowed-tools'], 'string');
        });
      });
    }
  });

  describe('引用文件存在性', () => {
    for (const skill of skills) {
      const referencedPaths = extractReferencePaths(skill.content);
      if (referencedPaths.length === 0) continue;

      describe(`[${skill.dir}]`, () => {
        for (const refFile of referencedPaths) {
          it(`references/${refFile} 文件存在`, () => {
            const fullPath = path.join(skill.path, 'references', refFile);
            assert.ok(fs.existsSync(fullPath), `引用的文件不存在: references/${refFile}`);
          });
        }
      });
    }
  });

  describe('交叉引用一致性', () => {
    // 入口 skill（egg/）引用的子 skill 必须存在
    const entrySkill = loadSkill('egg');

    it('入口 skill 存在', () => {
      assert.ok(entrySkill, 'egg/SKILL.md 不存在');
    });

    // 从入口 skill 中提取提到的 skills-xxx 引用
    const skillRefRegex = /@eggjs\/skills-(\w+)/g;
    const referencedSkills: string[] = [];
    let match;
    while ((match = skillRefRegex.exec(entrySkill.content)) !== null) {
      referencedSkills.push(match[1]);
    }

    for (const refSkill of new Set(referencedSkills)) {
      it(`入口 skill 引用的 @eggjs/skills-${refSkill} 有对应的 skill 目录`, () => {
        // skills-core → tegg-core, skills-controller → controller
        const possibleDirs = [refSkill, `tegg-${refSkill}`, refSkill.replace(/^tegg-/, '')];
        const found = possibleDirs.some((d) => skillDirs.includes(d));
        assert.ok(
          found,
          `入口 skill 引用了 @eggjs/skills-${refSkill}，但未找到对应目录。` +
            `\n  已有的 skill 目录: ${skillDirs.join(', ')}`,
        );
      });
    }
  });

  describe('Markdown 结构', () => {
    for (const skill of skills) {
      describe(`[${skill.dir}]`, () => {
        it('以一级标题开头', () => {
          const firstHeading = skill.content.match(/^(#{1,6})\s/m);
          assert.ok(firstHeading, 'SKILL.md 内容中没有标题');
          assert.equal(firstHeading[1], '#', '第一个标题应为一级标题');
        });

        it('标题层级不跳级', () => {
          const headings = [...skill.content.matchAll(/^(#{1,6})\s+(.+)$/gm)];
          let lastLevel = 0;

          for (const heading of headings) {
            const level = heading[1].length;
            if (lastLevel > 0 && level > lastLevel + 1) {
              assert.fail(
                `标题跳级: "${heading[2]}" 是 h${level}，但上一个标题是 h${lastLevel}` +
                  `（最多应为 h${lastLevel + 1}）`,
              );
            }
            lastLevel = level;
          }
        });
      });
    }

    // 同样校验 references/ 下的 md 文件
    for (const skillDir of skillDirs) {
      const refs = listReferences(skillDir);
      for (const ref of refs) {
        describe(`[${skillDir}/references/${ref}]`, () => {
          it('标题层级不跳级', () => {
            const content = fs.readFileSync(
              path.join(skills.find((s) => s.dir === skillDir)!.path, 'references', ref),
              'utf-8',
            );
            const headings = [...content.matchAll(/^(#{1,6})\s+(.+)$/gm)];
            let lastLevel = 0;

            for (const heading of headings) {
              const level = heading[1].length;
              if (lastLevel > 0 && level > lastLevel + 1) {
                assert.fail(`标题跳级: "${heading[2]}" 是 h${level}，但上一个标题是 h${lastLevel}`);
              }
              lastLevel = level;
            }
          });
        });
      }
    }
  });

  describe('决策表完整性', () => {
    const entrySkill = loadSkill('egg');

    it('入口 skill 包含快速参考表', () => {
      assert.ok(
        entrySkill.content.includes('快速参考表') || entrySkill.content.includes('快速决策'),
        '入口 skill 应包含快速参考/决策表',
      );
    });

    it('入口 skill 包含决策框架', () => {
      assert.ok(
        entrySkill.content.includes('决策框架') || entrySkill.content.includes('决策树'),
        '入口 skill 应包含决策框架或决策树',
      );
    });
  });
});
