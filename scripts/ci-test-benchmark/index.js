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
import { ensureDir, readJsonIfExists } from './fs.js';
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

  const vitestJsonPath = path.join(outputDir, VITEST_JSON_FILENAME);
  const reportJsonPath = path.join(outputDir, REPORT_JSON_FILENAME);
  const reportMarkdownPath = path.join(outputDir, REPORT_MARKDOWN_FILENAME);
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

  console.log(`Benchmark report written to ${reportMarkdownPath}`);
  console.log(`Benchmark JSON written to ${reportJsonPath}`);

  if (run.error) {
    console.error(`Benchmark command failed to start: ${run.error.message}`);
  }
  if (run.exitCode !== 0) {
    process.exitCode = run.exitCode ?? 1;
  }
}

function createRunId(date = new Date()) {
  return date.toISOString().replaceAll(':', '').replaceAll('.', '-');
}

function normalizeOutputDir(outputDir) {
  return path.resolve(process.cwd(), outputDir || path.join(DEFAULT_OUTPUT_ROOT, createRunId()));
}
