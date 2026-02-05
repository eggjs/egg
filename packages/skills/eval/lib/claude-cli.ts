import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { EVAL_WORKSPACE } from './setup.ts';

export interface ClaudeOptions {
  /** 工作目录，默认使用评测工作区（有 skills 安装） */
  cwd?: string;
  /** 追加 system prompt（不覆盖默认 + skills） */
  appendSystemPrompt?: string;
  /** 指定模型 */
  model?: string;
  /** 最大输出 tokens */
  maxTokens?: number;
}

function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

function spawnClaude(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempDir = mkdtempSync(join(tmpdir(), 'claude-eval-'));
    const cleanup = (): void => {
      try {
        rmSync(tempDir, { recursive: true });
      } catch {
        /* ignore */
      }
    };

    // 写一个 wrapper 脚本，避免 script 命令的 shell 转义问题
    const cmdFile = join(tempDir, 'cmd.sh');
    const escapedArgs = args.map(shellQuote).join(' ');
    writeFileSync(cmdFile, `#!/bin/sh\nexec claude ${escapedArgs}\n`, { mode: 0o755 });

    // 用 macOS `script -q` 分配真正的 PTY，让 claude 看到 isTTY=true
    // 不能直接传 /dev/tty FD 给 stdio（Bun kqueue EINVAL），也不能纯 pipe（claude 需要 TTY）
    const child = spawn('script', ['-q', '/dev/null', cmdFile], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let buffer = '';

    child.stdout!.on('data', (chunk: Buffer) => {
      // console.log(chunk.toString());
      buffer += chunk.toString('utf-8');
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      cleanup();
      reject(new Error('claude process timed out after 300s'));
    }, 300_000);

    child.on('error', (err) => {
      clearTimeout(timer);
      cleanup();
      reject(err);
    });

    child.on('close', () => {
      clearTimeout(timer);
      cleanup();
      // script 退出时 PTY 会回显 ^D（EOF），过滤掉控制字符
      // eslint-disable-next-line no-control-regex -- 需要过滤 PTY EOF 控制字符
      const result = buffer.replace(/\x04/g, '').replace(/\^D/g, '').trim();
      if (result) {
        resolve(result);
      } else {
        reject(new Error('No result received from claude'));
      }
    });
  });
}

/**
 * 在评测工作区中调用 claude -p
 * skills 通过 .claude/skills/ 目录自然发现和加载
 */
export async function claudeChat(userMessage: string, options: ClaudeOptions = {}): Promise<string> {
  const args = ['-p'];

  if (options.model) {
    args.push('--model', options.model);
  }

  if (options.maxTokens) {
    args.push('--max-tokens', String(options.maxTokens));
  }

  if (options.appendSystemPrompt) {
    args.push('--append-system-prompt', options.appendSystemPrompt);
  }

  args.push(userMessage);

  return spawnClaude(args, options.cwd ?? EVAL_WORKSPACE);
}

/**
 * 纯净模式调用 claude -p（禁用 skills，用于 Judge 评分）
 */
export async function claudePlain(userMessage: string, systemPrompt?: string): Promise<string> {
  const args = ['-p', '--disable-slash-commands'];

  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt);
  }

  args.push(userMessage);

  return spawnClaude(args, EVAL_WORKSPACE);
}
