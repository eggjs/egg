import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

import type { SyncOptions, SyncResult } from 'execa';
import { execaCommandSync } from 'execa';
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';

const SRC_PATH = path.join(import.meta.dirname, '../src');
const CLI_PATH = path.join(SRC_PATH, 'cli.ts');

const projectName = 'test-egg-app';
const genPath = path.join(import.meta.dirname, projectName);
const genPathWithSubfolder = path.join(import.meta.dirname, 'subfolder', projectName);
const tempDirPrefix = path.join(tmpdir(), 'my-app-temp-');
const tempDir = fs.mkdtempSync(tempDirPrefix);

const run = <SO extends SyncOptions>(args: string[], options?: SO): SyncResult<SO> => {
  return execaCommandSync(`node ${CLI_PATH} ${args.join(' ')}`, options);
};

// Helper to create a non-empty directory
const createNonEmptyDir = (overrideFolder?: string) => {
  // Create the temporary directory
  const newNonEmptyFolder = overrideFolder || genPath;
  fs.mkdirSync(newNonEmptyFolder, { recursive: true });

  // Create a package.json file
  const pkgJson = path.join(newNonEmptyFolder, 'package.json');
  fs.writeFileSync(pkgJson, '{ "foo": "bar", "type": "module" }');
};

const templateFiles = fs
  .readdirSync(path.join(SRC_PATH, 'templates', 'tegg'))
  // _gitignore is renamed to .gitignore
  .map(filePath => (filePath.startsWith('_') ? filePath.slice(1) : filePath))
  .sort();

const clearAnyPreviousFolders = () => {
  if (fs.existsSync(genPath)) {
    fs.rmSync(genPath, { recursive: true, force: true });
  }
  if (fs.existsSync(genPathWithSubfolder)) {
    fs.rmSync(genPathWithSubfolder, { recursive: true, force: true });
  }
};

beforeAll(() => clearAnyPreviousFolders());
afterEach(() => clearAnyPreviousFolders());
afterAll(() => fs.rmSync(tempDir, { recursive: true, force: true }));

test('prompts for the project name if none supplied', () => {
  const { stdout } = run([]);
  expect(stdout).toContain('Project name:');
});

test('prompts for the template if none supplied when target dir is current directory', () => {
  fs.mkdirSync(genPath, { recursive: true });
  const { stdout } = run(['.'], { cwd: genPath });
  expect(stdout).toContain('Select a template:');
});

test('prompts for the template if none supplied', () => {
  const { stdout } = run([projectName]);
  expect(stdout).toContain('Select a template:');
});

test('prompts for the template on not supplying a value for --template', () => {
  const { stdout } = run([projectName, '--template']);
  expect(stdout).toContain('Select a template:');
});

test('prompts for the template on supplying an invalid template', () => {
  const { stdout } = run([projectName, '--template', 'unknown']);
  expect(stdout).toContain(`"unknown" isn't a valid template. Please choose from below:`);
});

test('asks to overwrite non-empty target directory', () => {
  createNonEmptyDir();
  const { stdout } = run([projectName], { cwd: import.meta.dirname });
  expect(stdout).toContain(`Target directory "${projectName}" is not empty.`);
});

test('asks to overwrite non-empty target directory with subfolder', () => {
  createNonEmptyDir(genPathWithSubfolder);
  const { stdout } = run([`subfolder/${projectName}`], {
    cwd: import.meta.dirname,
  });
  expect(stdout).toContain(`Target directory "subfolder/${projectName}" is not empty.`);
});

test('asks to overwrite non-empty current directory', () => {
  createNonEmptyDir();
  const { stdout } = run(['.'], { cwd: genPath });
  expect(stdout).toContain(`Current directory is not empty.`);
});

test('successfully scaffolds a project based on tegg starter template', () => {
  const { stdout } = run([projectName, '--template', 'tegg'], {
    cwd: import.meta.dirname,
  });
  const generatedFiles = fs.readdirSync(genPath).sort();

  // Assertions
  expect(stdout).toContain(`Scaffolding project with`);
  expect(templateFiles).toEqual(generatedFiles);
});

test('successfully scaffolds a project based on simple-ts starter template', () => {
  const projectName = 'create-egg-test-simple-ts';
  const { stdout } = run([projectName, '--template', 'simple-ts'], {
    cwd: tempDir,
  });
  const projectDir = path.join(tempDir, projectName);
  const generatedFiles = fs.readdirSync(projectDir).sort();

  // Assertions
  expect(stdout).toContain(`Scaffolding project with`);
  expect(generatedFiles).matchSnapshot();

  // run test
  const monoRepoDir = path.join(import.meta.dirname, '../../../');
  const eggDir = path.join(monoRepoDir, 'packages/egg');
  const mockDir = path.join(monoRepoDir, 'plugins/mock');
  execaCommandSync(`pnpm link ${mockDir} ${eggDir}`, { cwd: projectDir });
  const { stdout: testStdout } = execaCommandSync('pnpm test:local', { cwd: projectDir });
  expect(testStdout).toContain('2 passed');
});

// FIXME: HelloService.test.skip.ts
// use "@oxc-node/core/register" to support decorator metadata
test('successfully scaffolds a project based on tegg starter template', () => {
  const projectName = 'create-egg-test-tegg';
  const { stdout } = run([projectName, '--template', 'tegg'], {
    cwd: tempDir,
  });
  const projectDir = path.join(tempDir, projectName);
  const generatedFiles = fs.readdirSync(projectDir).sort();

  // Assertions
  expect(stdout).toContain(`Scaffolding project with`);
  expect(generatedFiles).matchSnapshot();

  // run test
  const monoRepoDir = path.join(import.meta.dirname, '../../../');
  const eggDir = path.join(monoRepoDir, 'packages/egg');
  const mockDir = path.join(monoRepoDir, 'plugins/mock');
  execaCommandSync(`pnpm link ${mockDir} ${eggDir}`, { cwd: projectDir });
  const { stdout: testStdout } = execaCommandSync('pnpm test:local', { cwd: projectDir });
  expect(testStdout).toContain('2 passed');
});

test('works with the -t alias', () => {
  const { stdout } = run([projectName, '-t', 'tegg'], {
    cwd: import.meta.dirname,
  });
  const generatedFiles = fs.readdirSync(genPath).sort();

  // Assertions
  expect(stdout).toContain(`Scaffolding project`);
  expect(templateFiles).toEqual(generatedFiles);
});

test('accepts command line override for --overwrite', () => {
  createNonEmptyDir();
  const { stdout } = run(['.', '--overwrite', 'ignore'], { cwd: genPath });
  expect(stdout).not.toContain(`Current directory is not empty.`);
});

test('return help usage how to use create-egg', () => {
  const { stdout } = run(['--help'], { cwd: import.meta.dirname });
  const message = 'Usage: create-egg [OPTION]... [DIRECTORY]';
  expect(stdout).toContain(message);
});

test('return help usage how to use create-egg with -h alias', () => {
  const { stdout } = run(['--h'], { cwd: import.meta.dirname });
  const message = 'Usage: create-egg [OPTION]... [DIRECTORY]';
  expect(stdout).toContain(message);
});
