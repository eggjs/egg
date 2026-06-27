import path from 'node:path';

import { parseArgs, printHelp } from './cli.js';
import { buildCommand } from './command.js';
import {
  DEFAULT_OUTPUT_ROOT,
  REPORT_JSON_FILENAME,
  REPORT_MARKDOWN_FILENAME,
  VITEST_JSON_FILENAME,
} from './constants.js';
import { collectEnvironment } from './environment.js';
import { appendText, ensureDir, readJsonIfExists, readTextIfExists } from './fs.js';
import { createReport, writeReports } from './report.js';
import { createDryRunResult, runCommand } from './run-command.js';

export async function main(argv = process.argv.slice(2)) {
  const { command: customCommand, options } = parseArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = normalizeOutputDir(options.outputDir);
  await ensureDir(outputDir);

  const reportJsonPath = path.join(outputDir, REPORT_JSON_FILENAME);
  const reportMarkdownPath = path.join(outputDir, REPORT_MARKDOWN_FILENAME);

  if (options.reportOnly) {
    await runReportOnly({ options, outputDir, reportJsonPath, reportMarkdownPath });
    return;
  }

  const vitestJsonPath = path.join(outputDir, VITEST_JSON_FILENAME);
  const command = buildCommand(customCommand, options, vitestJsonPath);
  const env = {
    ...process.env,
    CI_BENCHMARK_OUTPUT_DIR: outputDir,
    CI_BENCHMARK_VITEST_JSON: vitestJsonPath,
  };
  const run = options.dryRun ? createDryRunResult() : await runCommand(command, env);
  const [vitestJson, environment] = await Promise.all([readJsonIfExists(vitestJsonPath), collectEnvironment(command)]);
  const report = createReport({
    command,
    environment,
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

  await writeReports(report, reportJsonPath, reportMarkdownPath);
  await appendStepSummary(reportMarkdownPath);

  console.log(`Benchmark report written to ${reportMarkdownPath}`);
  console.log(`Benchmark JSON written to ${reportJsonPath}`);

  if (run.error) {
    console.error(`Benchmark command failed to start: ${run.error.message}`);
  }
  if (run.exitCode !== 0) {
    process.exitCode = run.exitCode ?? 1;
  }
}

// Build a report from an existing Vitest JSON without running tests. This is the
// CI path: the gating `ut run ci` run already produced the JSON, and this step only
// summarizes it. It never fails the job — gating already happened during the test step.
async function runReportOnly({ options, outputDir, reportJsonPath, reportMarkdownPath }) {
  const vitestJsonPath = options.vitestJson
    ? path.resolve(process.cwd(), options.vitestJson)
    : path.join(outputDir, VITEST_JSON_FILENAME);
  const command = ['(report-only)', '--vitest-json', vitestJsonPath];
  const [vitestJson, environment] = await Promise.all([readJsonIfExists(vitestJsonPath), collectEnvironment(command)]);

  if (!vitestJson) {
    console.warn(`No Vitest JSON found at ${vitestJsonPath}; nothing to report.`);
  }

  const report = createReport({
    command,
    environment,
    name: options.name,
    outputFiles: {
      json: reportJsonPath,
      markdown: reportMarkdownPath,
      vitestJson: vitestJsonPath,
    },
    reportOnly: true,
    run: deriveRunFromJson(vitestJson),
    topLimit: options.top,
    vitestJson,
  });

  await writeReports(report, reportJsonPath, reportMarkdownPath);
  await appendStepSummary(reportMarkdownPath);

  console.log(`Benchmark report written to ${reportMarkdownPath}`);
  console.log(`Benchmark JSON written to ${reportJsonPath}`);
}

// Synthesize a run summary (wall time, start/end) from the per-file intervals of an
// existing Vitest JSON so the "Run" section is meaningful in report-only mode.
function deriveRunFromJson(vitestJson) {
  const results = Array.isArray(vitestJson?.testResults) ? vitestJson.testResults : [];
  const intervals = results
    .filter((result) => typeof result.startTime === 'number' && typeof result.endTime === 'number')
    .map((result) => ({ end: result.endTime, start: result.startTime }));

  if (intervals.length === 0) {
    return { endedAt: null, error: null, exitCode: 0, signal: null, startedAt: null, wallTimeMs: null };
  }

  const firstStart = Math.min(...intervals.map((interval) => interval.start));
  const lastEnd = Math.max(...intervals.map((interval) => interval.end));
  return {
    endedAt: new Date(lastEnd).toISOString(),
    error: null,
    exitCode: 0,
    signal: null,
    startedAt: new Date(firstStart).toISOString(),
    wallTimeMs: Math.max(0, Math.round(lastEnd - firstStart)),
  };
}

async function appendStepSummary(reportMarkdownPath) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }
  const markdown = await readTextIfExists(reportMarkdownPath);
  if (!markdown) {
    return;
  }
  await appendText(summaryPath, `${markdown}\n`);
  console.log(`Benchmark report appended to GitHub step summary (${summaryPath})`);
}

function createRunId(date = new Date()) {
  return date.toISOString().replaceAll(':', '').replaceAll('.', '-');
}

function normalizeOutputDir(outputDir) {
  return path.resolve(process.cwd(), outputDir || path.join(DEFAULT_OUTPUT_ROOT, createRunId()));
}
