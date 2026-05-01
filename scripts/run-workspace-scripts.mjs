import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const script = process.argv[2];
if (!script) {
  console.error('Usage: node scripts/run-workspace-scripts.mjs <script>');
  process.exit(1);
}

const root = resolve(import.meta.dirname, '..');
const workspaceFile = join(root, 'pnpm-workspace.yaml');

function readWorkspacePatterns() {
  const patterns = [];
  let inPackages = false;

  for (const line of readFileSync(workspaceFile, 'utf8').split('\n')) {
    if (line.trim() === 'packages:') {
      inPackages = true;
      continue;
    }
    if (inPackages && line.length > 0 && !line.startsWith(' ')) {
      break;
    }

    const match = /^\s+-\s+(.+?)\s*$/.exec(line);
    if (inPackages && match) {
      patterns.push(match[1].replace(/^['"]|['"]$/g, ''));
    }
  }

  return patterns.sort((a, b) => a.localeCompare(b));
}

function expandWorkspacePattern(pattern) {
  if (!pattern.endsWith('/*')) {
    return [join(root, pattern)];
  }

  const baseDir = join(root, pattern.slice(0, -2));
  return readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => join(baseDir, entry.name));
}

let matched = 0;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

for (const workspaceDir of readWorkspacePatterns().flatMap(expandWorkspacePattern)) {
  const packageJsonPath = join(workspaceDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    continue;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  if (!packageJson.scripts?.[script]) {
    continue;
  }

  matched++;
  console.log(`> ${packageJson.name ?? workspaceDir} ${script}`);
  const result = spawnSync(npmCommand, ['run', '--silent', script], {
    cwd: workspaceDir,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (matched === 0) {
  console.log(`No workspace scripts found for "${script}"`);
}
