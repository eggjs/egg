#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_TOP_LIMIT = 20;
const DEFAULT_OUTPUT_ROOT = path.join('benchmark', 'ci-test');
const VITEST_JSON_FILENAME = 'vitest-results.json';
const REPORT_JSON_FILENAME = 'report.json';
const REPORT_MARKDOWN_FILENAME = 'report.md';
const VITEST_JSON_PLACEHOLDER = '{vitestJson}';
const DEFAULT_COMMAND = [
  'pnpm',
  'exec',
  'vitest',
  'run',
  '--bail',
  '1',
  '--retry',
  '2',
  '--testTimeout',
  '20000',
  '--hookTimeout',
  '20000',
];
const BOOLEAN_COMMAND_OPTIONS = new Set(['--isolate', '--no-isolate']);

function printHelp() {
  console.log(`
Usage:
  pnpm run benchmark:ci-test
  pnpm run benchmark:ci-test -- --coverage
  pnpm run benchmark:ci-test -- --output-dir .tmp/bench -- pnpm exec vitest run --maxWorkers=4

Options:
  --output-dir <dir>                 Directory for report.md, report.json, and raw Vitest JSON.
  --name <label>                     Human-readable benchmark label.
  --top <n>                          Number of long-tail files/projects to include. Default: ${DEFAULT_TOP_LIMIT}.
  --coverage                         Append --coverage to the default Vitest command.
  --no-append-vitest-json-reporter   Do not append --reporter=json/--outputFile to the command.
  --dry-run                          Generate reports without executing the test command.
  --help                             Show this help.

Custom command:
  Arguments after -- replace the default command. The script appends Vitest JSON reporter args by default.
  Use ${VITEST_JSON_PLACEHOLDER} inside a custom command arg if the output path must be embedded manually.
`);
}

function parseArgs(argv) {
  argv = normalizePackageManagerArgv(argv);
  const options = {
    appendVitestJsonReporter: true,
    coverage: false,
    dryRun: false,
    name: 'CI test benchmark',
    outputDir: '',
    top: DEFAULT_TOP_LIMIT,
  };
  const command = [];

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--') {
      command.push(...argv.slice(index + 1));
      break;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--coverage') {
      options.coverage = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--no-append-vitest-json-reporter') {
      options.appendVitestJsonReporter = false;
      continue;
    }
    if (arg === '--output-dir') {
      options.outputDir = readOptionValue(argv, ++index, arg);
      continue;
    }
    if (arg.startsWith('--output-dir=')) {
      options.outputDir = arg.slice('--output-dir='.length);
      continue;
    }
    if (arg === '--name') {
      options.name = readOptionValue(argv, ++index, arg);
      continue;
    }
    if (arg.startsWith('--name=')) {
      options.name = arg.slice('--name='.length);
      continue;
    }
    if (arg === '--top') {
      options.top = parsePositiveInteger(readOptionValue(argv, ++index, arg), arg);
      continue;
    }
    if (arg.startsWith('--top=')) {
      options.top = parsePositiveInteger(arg.slice('--top='.length), '--top');
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { command, options };
}

function normalizePackageManagerArgv(argv) {
  if (argv[0] === '--' && argv.length > 1 && argv[1].startsWith('--')) {
    return argv.slice(1);
  }
  return argv;
}

function readOptionValue(argv, index, optionName) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${optionName} requires a value`);
  }
  return value;
}

function parsePositiveInteger(value, optionName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${optionName} must be a positive integer`);
  }
  return parsed;
}

function createRunId(date = new Date()) {
  return date.toISOString().replaceAll(':', '').replaceAll('.', '-');
}

function normalizeOutputDir(outputDir) {
  return path.resolve(process.cwd(), outputDir || path.join(DEFAULT_OUTPUT_ROOT, createRunId()));
}

function buildCommand(commandArgs, options, vitestJsonPath) {
  const command = commandArgs.length > 0 ? [...commandArgs] : [...DEFAULT_COMMAND];
  if (options.coverage && commandArgs.length === 0) {
    command.push('--coverage');
  }

  const replaced = command.map((arg) => arg.replaceAll(VITEST_JSON_PLACEHOLDER, vitestJsonPath));
  if (!options.appendVitestJsonReporter) {
    return replaced;
  }

  const hasReporter = hasJsonReporter(replaced);
  const hasOutputFile = hasVitestOutputFile(replaced);
  const reporterArgs = [];
  if (!hasReporter) {
    reporterArgs.push('--reporter=json');
  }
  if (!hasOutputFile) {
    reporterArgs.push(`--outputFile=${vitestJsonPath}`);
  }

  if (reporterArgs.length === 0) {
    return replaced;
  }
  return [...replaced, ...reporterArgs];
}

function hasJsonReporter(command) {
  for (let index = 0; index < command.length; index++) {
    const arg = command[index];
    if (arg === '--reporter=json') {
      return true;
    }
    if (arg === '--reporter' && command[index + 1] === 'json') {
      return true;
    }
  }
  return false;
}

function hasVitestOutputFile(command) {
  return command.some(
    (arg) => arg === '--outputFile' || arg.startsWith('--outputFile=') || arg.startsWith('--outputFile.'),
  );
}

async function runCommand(command, env) {
  if (command.length === 0) {
    throw new Error('No command to run');
  }
  const start = process.hrtime.bigint();
  const startedAt = new Date().toISOString();

  const result = await new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      resolve({
        error: {
          code: error.code,
          message: error.message,
        },
        exitCode: 1,
        signal: null,
      });
    });
    child.on('close', (exitCode, signal) => {
      resolve({
        error: null,
        exitCode,
        signal,
      });
    });
  });

  const endedAt = new Date().toISOString();
  const wallTimeMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
  return {
    ...result,
    endedAt,
    startedAt,
    wallTimeMs,
  };
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`Failed to parse JSON report at ${filePath}: ${error.message}`);
    return null;
  }
}

function collectEnvironment(command) {
  const packageJson = readJsonIfExists(path.resolve(process.cwd(), 'package.json')) ?? {};
  return {
    arch: os.arch(),
    ci: process.env.CI === 'true',
    cpuCount: os.cpus().length,
    cpuModel: os.cpus()[0]?.model ?? 'unknown',
    cwd: process.cwd(),
    env: pickEnv([
      'CI',
      'GITHUB_ACTIONS',
      'GITHUB_EVENT_NAME',
      'GITHUB_REF',
      'GITHUB_RUN_ATTEMPT',
      'GITHUB_RUN_ID',
      'GITHUB_SHA',
      'NODE_ENV',
      'RUNNER_ARCH',
      'RUNNER_NAME',
      'RUNNER_OS',
      'VITEST_MAX_THREADS',
      'VITEST_MIN_THREADS',
      'VITEST_POOL_ID',
    ]),
    loadavg: os.loadavg(),
    node: process.version,
    packageManager: packageJson.packageManager ?? null,
    platform: os.platform(),
    release: os.release(),
    totalMemoryBytes: os.totalmem(),
    vitestConfig: readVitestConfigDefaults(path.resolve(process.cwd(), 'vitest.config.ts')),
    commandParameters: extractCommandParameters(command),
  };
}

function pickEnv(names) {
  const values = {};
  for (const name of names) {
    if (process.env[name] !== undefined) {
      values[name] = process.env[name];
    }
  }
  return values;
}

function readVitestConfigDefaults(configPath) {
  if (!fs.existsSync(configPath)) {
    return null;
  }
  const source = fs.readFileSync(configPath, 'utf8');
  return {
    coverageProvider: matchStringProperty(source, 'provider'),
    isolate: matchBooleanProperty(source, 'isolate'),
    pool: matchStringProperty(source, 'pool'),
  };
}

function matchStringProperty(source, property) {
  const match = new RegExp(`^\\s*(?!//|/\\*)${escapeRegExp(property)}:\\s*['"]([^'"]+)['"]`, 'm').exec(source);
  return match?.[1] ?? null;
}

function matchBooleanProperty(source, property) {
  const match = new RegExp(`^\\s*(?!//|/\\*)${escapeRegExp(property)}:\\s*(true|false)`, 'm').exec(source);
  if (!match) {
    return null;
  }
  return match[1] === 'true';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractCommandParameters(command) {
  return {
    coverage: command.some((arg) => arg === '--coverage' || arg.startsWith('--coverage=')),
    isolate: collectOptionValues(command, ['--isolate', '--no-isolate']),
    pool: collectOptionValues(command, ['--pool']),
    reporter: collectOptionValues(command, ['--reporter']),
    retry: collectOptionValues(command, ['--retry']),
    hookTimeout: collectOptionValues(command, ['--hookTimeout']),
    testTimeout: collectOptionValues(command, ['--testTimeout']),
    workers: collectOptionValues(command, [
      '--maxWorkers',
      '--minWorkers',
      '--poolOptions.threads.maxThreads',
      '--poolOptions.threads.minThreads',
      '--poolOptions.forks.maxForks',
      '--poolOptions.forks.minForks',
    ]),
  };
}

function collectOptionValues(command, names) {
  const values = [];
  for (let index = 0; index < command.length; index++) {
    const arg = command[index];
    for (const name of names) {
      if (arg === name) {
        const next = command[index + 1];
        const value = getSeparatedOptionValue(name, next);
        values.push({ name, value });
      } else if (arg.startsWith(`${name}=`)) {
        values.push({ name, value: arg.slice(name.length + 1) });
      }
    }
  }
  return values;
}

function getSeparatedOptionValue(name, next) {
  if (name.startsWith('--no-')) {
    return false;
  }
  if (BOOLEAN_COMMAND_OPTIONS.has(name)) {
    return true;
  }
  return next && !next.startsWith('--') ? next : true;
}

function summarizeVitest(vitestJson, topLimit) {
  const testResults = Array.isArray(vitestJson?.testResults) ? vitestJson.testResults : [];
  const files = testResults.map((result) => summarizeFileResult(result)).sort((a, b) => b.durationMs - a.durationMs);
  const projects = summarizeProjects(files).sort((a, b) => b.durationMs - a.durationMs);

  return {
    files,
    longTailFiles: files.slice(0, topLimit),
    longTailProjects: projects.slice(0, topLimit),
    projects,
    rawSummary: pickExisting(vitestJson ?? {}, [
      'numFailedTestSuites',
      'numFailedTests',
      'numPassedTestSuites',
      'numPassedTests',
      'numPendingTestSuites',
      'numPendingTests',
      'numRuntimeErrorTestSuites',
      'numTodoTests',
      'numTotalTestSuites',
      'numTotalTests',
      'openHandles',
      'snapshot',
      'startTime',
      'success',
      'wasInterrupted',
    ]),
  };
}

function summarizeFileResult(result) {
  const filePath = result.name ?? result.filepath ?? result.filePath ?? result.path ?? 'unknown';
  const assertions = Array.isArray(result.assertionResults) ? result.assertionResults : [];
  return {
    durationMs: getDurationMs(result),
    failedTests: assertions.filter((assertion) => assertion.status === 'failed').length,
    file: normalizeFilePath(filePath),
    passedTests: assertions.filter((assertion) => assertion.status === 'passed').length,
    pendingTests: assertions.filter((assertion) => assertion.status === 'pending' || assertion.status === 'skipped')
      .length,
    project: result.projectName ?? inferProjectName(filePath),
    status: result.status ?? 'unknown',
    totalTests: assertions.length,
  };
}

function getDurationMs(result) {
  if (typeof result.duration === 'number') {
    return Math.max(0, Math.round(result.duration));
  }
  if (typeof result.perfStats?.runtime === 'number') {
    return Math.max(0, Math.round(result.perfStats.runtime));
  }
  if (typeof result.perfStats?.start === 'number' && typeof result.perfStats?.end === 'number') {
    return Math.max(0, Math.round(result.perfStats.end - result.perfStats.start));
  }
  if (typeof result.startTime === 'number' && typeof result.endTime === 'number') {
    return Math.max(0, Math.round(result.endTime - result.startTime));
  }
  return 0;
}

function normalizeFilePath(filePath) {
  const relative = path.isAbsolute(filePath) ? path.relative(process.cwd(), filePath) : filePath;
  return relative.split(path.sep).join('/');
}

function inferProjectName(filePath) {
  const normalized = normalizeFilePath(filePath);
  const parts = normalized.split('/');
  if (parts[0] === 'packages' || parts[0] === 'plugins' || parts[0] === 'tools' || parts[0] === 'examples') {
    return parts.slice(0, 2).join('/');
  }
  if (parts[0] === 'tegg' && parts.length >= 3) {
    return parts.slice(0, 3).join('/');
  }
  return parts[0] || 'unknown';
}

function summarizeProjects(files) {
  const projects = new Map();
  for (const file of files) {
    const current = projects.get(file.project) ?? {
      durationMs: 0,
      failedTests: 0,
      files: 0,
      passedTests: 0,
      pendingTests: 0,
      project: file.project,
      totalTests: 0,
    };
    current.durationMs += file.durationMs;
    current.failedTests += file.failedTests;
    current.files++;
    current.passedTests += file.passedTests;
    current.pendingTests += file.pendingTests;
    current.totalTests += file.totalTests;
    projects.set(file.project, current);
  }
  return [...projects.values()];
}

function pickExisting(source, keys) {
  const result = {};
  for (const key of keys) {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

function createReport({ command, environment, name, outputFiles, run, topLimit, vitestJson }) {
  return {
    command,
    environment,
    generatedAt: new Date().toISOString(),
    name,
    outputFiles,
    run,
    topLimit,
    vitest: vitestJson ? summarizeVitest(vitestJson, topLimit) : null,
  };
}

function writeReportJson(report, filePath) {
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
}

function writeReportMarkdown(report, filePath) {
  fs.writeFileSync(filePath, renderMarkdown(report));
}

function renderMarkdown(report) {
  const commandLine = shellJoin(report.command);
  const run = report.run;
  const env = report.environment;
  const vitest = report.vitest;
  const summary = vitest?.rawSummary ?? {};
  const lines = [
    `# ${report.name}`,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Command',
    '',
    '```sh',
    commandLine,
    '```',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Exit code | ${formatValue(run.exitCode)} |`,
    `| Signal | ${formatValue(run.signal)} |`,
    `| Wall time | ${formatDuration(run.wallTimeMs)} |`,
    `| Started at | ${run.startedAt} |`,
    `| Ended at | ${run.endedAt} |`,
    '',
    '## Environment',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Node | ${env.node} |`,
    `| Platform | ${env.platform} ${env.release} ${env.arch} |`,
    `| CPU | ${escapeTable(`${env.cpuCount} x ${env.cpuModel}`)} |`,
    `| Total memory | ${formatBytes(env.totalMemoryBytes)} |`,
    `| Package manager | ${formatValue(env.packageManager)} |`,
    `| CI | ${String(env.ci)} |`,
    `| Vitest pool default | ${formatValue(env.vitestConfig?.pool)} |`,
    `| Vitest isolate default | ${formatValue(env.vitestConfig?.isolate)} |`,
    `| Vitest coverage provider | ${formatValue(env.vitestConfig?.coverageProvider)} |`,
    '',
    '## Parameters',
    '',
    '| Parameter | Value |',
    '| --- | --- |',
    `| Coverage | ${String(env.commandParameters.coverage)} |`,
    `| Reporter | ${formatOptionValues(env.commandParameters.reporter)} |`,
    `| Retry | ${formatOptionValues(env.commandParameters.retry)} |`,
    `| Test timeout | ${formatOptionValues(env.commandParameters.testTimeout)} |`,
    `| Hook timeout | ${formatOptionValues(env.commandParameters.hookTimeout)} |`,
    `| Pool | ${formatOptionValues(env.commandParameters.pool)} |`,
    `| Worker options | ${formatOptionValues(env.commandParameters.workers)} |`,
    `| Isolate options | ${formatOptionValues(env.commandParameters.isolate)} |`,
    '',
    '## Vitest Summary',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Success | ${formatValue(summary.success)} |`,
    `| Total suites | ${formatValue(summary.numTotalTestSuites)} |`,
    `| Passed suites | ${formatValue(summary.numPassedTestSuites)} |`,
    `| Failed suites | ${formatValue(summary.numFailedTestSuites)} |`,
    `| Total tests | ${formatValue(summary.numTotalTests)} |`,
    `| Passed tests | ${formatValue(summary.numPassedTests)} |`,
    `| Failed tests | ${formatValue(summary.numFailedTests)} |`,
    '',
  ];

  if (!vitest) {
    lines.push('Vitest JSON reporter output was not found, so per-file and per-project tables are unavailable.', '');
  } else {
    lines.push(
      '## Long-Tail Projects',
      '',
      '| Project | Files | Tests | Failed | Duration |',
      '| --- | ---: | ---: | ---: | ---: |',
      ...vitest.longTailProjects.map(
        (project) =>
          `| ${escapeTable(project.project)} | ${project.files} | ${project.totalTests} | ${project.failedTests} | ${formatDuration(project.durationMs)} |`,
      ),
      '',
      '## Long-Tail Files',
      '',
      '| File | Project | Tests | Failed | Duration |',
      '| --- | --- | ---: | ---: | ---: |',
      ...vitest.longTailFiles.map(
        (file) =>
          `| ${escapeTable(file.file)} | ${escapeTable(file.project)} | ${file.totalTests} | ${file.failedTests} | ${formatDuration(file.durationMs)} |`,
      ),
      '',
    );
  }

  lines.push(
    '## Output Files',
    '',
    '| File | Path |',
    '| --- | --- |',
    `| Markdown report | ${escapeTable(report.outputFiles.markdown)} |`,
    `| JSON report | ${escapeTable(report.outputFiles.json)} |`,
    `| Raw Vitest JSON | ${escapeTable(report.outputFiles.vitestJson)} |`,
    '',
    '## GitHub Actions Artifact',
    '',
    'This command does not change required checks or CI gate semantics. To collect it in a manual workflow, run the benchmark command and upload the output directory as an artifact.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

function shellJoin(command) {
  return command.map((arg) => (arg.includes(' ') ? JSON.stringify(arg) : arg)).join(' ');
}

function formatOptionValues(values) {
  if (!values || values.length === 0) {
    return 'not set';
  }
  return escapeTable(values.map((item) => `${item.name}=${String(item.value)}`).join(', '));
}

function formatDuration(ms) {
  if (typeof ms !== 'number') {
    return 'n/a';
  }
  if (ms < 1000) {
    return `${ms} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatBytes(bytes) {
  if (typeof bytes !== 'number') {
    return 'n/a';
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
}

function formatValue(value) {
  if (value === undefined || value === null || value === '') {
    return 'n/a';
  }
  return escapeTable(String(value));
}

function escapeTable(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

async function main() {
  const { command: customCommand, options } = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = normalizeOutputDir(options.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  const vitestJsonPath = path.join(outputDir, VITEST_JSON_FILENAME);
  const reportJsonPath = path.join(outputDir, REPORT_JSON_FILENAME);
  const reportMarkdownPath = path.join(outputDir, REPORT_MARKDOWN_FILENAME);
  const command = buildCommand(customCommand, options, vitestJsonPath);
  const env = {
    ...process.env,
    CI_BENCHMARK_OUTPUT_DIR: outputDir,
    CI_BENCHMARK_VITEST_JSON: vitestJsonPath,
  };

  const run = options.dryRun
    ? {
        endedAt: new Date().toISOString(),
        error: null,
        exitCode: 0,
        signal: null,
        startedAt: new Date().toISOString(),
        wallTimeMs: 0,
      }
    : await runCommand(command, env);

  const vitestJson = readJsonIfExists(vitestJsonPath);
  const report = createReport({
    command,
    environment: collectEnvironment(command),
    name: options.name,
    outputFiles: {
      json: reportJsonPath,
      markdown: reportMarkdownPath,
      vitestJson: vitestJsonPath,
    },
    run,
    topLimit: options.top,
    vitestJson,
  });

  writeReportJson(report, reportJsonPath);
  writeReportMarkdown(report, reportMarkdownPath);

  console.log(`Benchmark report written to ${reportMarkdownPath}`);
  console.log(`Benchmark JSON written to ${reportJsonPath}`);

  if (run.error) {
    console.error(`Benchmark command failed to start: ${run.error.message}`);
  }
  if (run.exitCode !== 0) {
    process.exitCode = run.exitCode ?? 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
