import { shellJoin } from './command.js';
import { writeJson, writeText } from './fs.js';
import { summarizeVitest } from './vitest-summary.js';

export function createReport({
  command,
  environment,
  name,
  outputFiles,
  reportOnly = false,
  run,
  topLimit,
  vitestJson,
}) {
  return {
    command,
    environment,
    generatedAt: new Date().toISOString(),
    name,
    outputFiles,
    reportOnly,
    run,
    topLimit,
    vitest: vitestJson ? summarizeVitest(vitestJson, topLimit) : null,
  };
}

export async function writeReports(report, reportJsonPath, reportMarkdownPath) {
  await Promise.all([writeJson(reportJsonPath, report), writeText(reportMarkdownPath, renderMarkdown(report))]);
}

function renderMarkdown(report) {
  const run = report.run;
  const env = report.environment;
  const vitest = report.vitest;
  const summary = vitest?.rawSummary ?? {};
  // In report-only mode the run is synthesized from the Vitest JSON: there is no real
  // process exit code, and the "wall time" is only the test-execution window (excludes
  // transform/import and beforeAll). Render it honestly instead of a measured run.
  const runRows = report.reportOnly
    ? [
        `| Execution window (from Vitest JSON) | ${formatDuration(run.wallTimeMs)} |`,
        `| Started at | ${formatValue(run.startedAt)} |`,
        `| Ended at | ${formatValue(run.endedAt)} |`,
      ]
    : [
        `| Exit code | ${formatValue(run.exitCode)} |`,
        `| Signal | ${formatValue(run.signal)} |`,
        `| Wall time | ${formatDuration(run.wallTimeMs)} |`,
        `| Started at | ${formatValue(run.startedAt)} |`,
        `| Ended at | ${formatValue(run.endedAt)} |`,
      ];
  const lines = [
    `# ${report.name}`,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Command',
    '',
    '```sh',
    shellJoin(report.command),
    '```',
    '',
    '## Run',
    '',
    '| Field | Value |',
    '| --- | --- |',
    ...runRows,
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

  appendParallelismSection(lines, vitest, env);
  appendLongTailTables(lines, vitest);
  appendOutputSection(lines, report);
  return `${lines.join('\n')}\n`;
}

function appendParallelismSection(lines, vitest, env) {
  const parallelism = vitest?.parallelism;
  if (!parallelism || parallelism.fileCount === 0) {
    lines.push(
      '## Parallelism',
      '',
      'Per-file timing intervals were not available, so parallelism metrics could not be computed.',
      '',
    );
    return;
  }

  const ceiling = typeof env.workerCeiling === 'number' && env.workerCeiling > 0 ? env.workerCeiling : null;
  const avg = parallelism.avgConcurrency;
  const efficiency = ceiling && typeof avg === 'number' ? avg / ceiling : null;
  const headroom =
    parallelism.criticalPathMs > 0 && typeof parallelism.executionWindowMs === 'number'
      ? parallelism.executionWindowMs / parallelism.criticalPathMs
      : null;

  lines.push(
    '## Parallelism',
    '',
    // Peak concurrency is the headline: it is the true max overlap of file runs and,
    // unlike avg/efficiency, is not deflated by the transform/import time excluded from
    // the spans (see footnote).
    `**Peak concurrency: ${parallelism.peakConcurrency}** of ${formatValue(ceiling)} worker ceiling — the most files Vitest ran at once.`,
    '',
    '| Metric | Value |',
    '| --- | --- |',
    `| Isolate | ${formatValue(env.vitestConfig?.isolate)} |`,
    `| Pool | ${formatValue(env.vitestConfig?.pool)} |`,
    `| Available parallelism | ${formatValue(env.availableParallelism)} |`,
    `| Worker ceiling (effective) | ${formatValue(ceiling)} |`,
    `| Files measured | ${parallelism.fileCount} |`,
    `| Execution window | ${formatDuration(parallelism.executionWindowMs)} |`,
    `| Busy time (sum of file spans) | ${formatDuration(parallelism.busyTimeMs)} |`,
    `| Peak concurrency | ${formatValue(parallelism.peakConcurrency)} |`,
    `| Avg concurrency (lower bound) | ${formatConcurrency(avg)} |`,
    `| Parallel efficiency (avg ÷ ceiling, lower bound) | ${formatPercent(efficiency)} |`,
    `| Critical path (longest file) | ${formatDuration(parallelism.criticalPathMs)} |`,
    `| Window ÷ critical path | ${formatConcurrency(headroom)} |`,
    '',
    `Critical path file: ${parallelism.criticalPathFile ? `\`${parallelism.criticalPathFile}\`` : 'n/a'}`,
    '',
    '> Concurrency is reconstructed from Vitest per-file execution spans (min test start .. max test end), which cover test bodies and per-test beforeEach/afterEach but **exclude suite-level beforeAll/afterAll (where egg boots its apps — often the dominant per-file cost) and module transform/import**. That excluded time still occupies the worker threads, so **avg concurrency and parallel efficiency are lower bounds on real worker utilization** — for beforeAll-heavy or transform-bound files avg can even read below 1 while peak is high. **Peak concurrency** (max simultaneous overlap) is the robust signal. "Worker ceiling" mirrors vitest.config.ts (Windows CI caps workers; otherwise the machine\'s available parallelism).',
    '',
  );
}

function appendLongTailTables(lines, vitest) {
  if (!vitest) {
    lines.push('Vitest JSON reporter output was not found, so per-file and per-project tables are unavailable.', '');
    return;
  }

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

function appendOutputSection(lines, report) {
  lines.push(
    '## Output Files',
    '',
    '| File | Path |',
    '| --- | --- |',
    `| Markdown report | ${escapeTable(report.outputFiles.markdown)} |`,
    `| JSON report | ${escapeTable(report.outputFiles.json)} |`,
    `| Raw Vitest JSON | ${escapeTable(report.outputFiles.vitestJson)} |`,
    '',
    '## GitHub Actions',
    '',
    'This command does not change required checks or CI gate semantics. When `GITHUB_STEP_SUMMARY` is set, this report is appended to the job summary automatically.',
    '',
  );
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

function formatConcurrency(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'n/a';
  }
  return `${value.toFixed(2)}x`;
}

function formatPercent(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'n/a';
  }
  return `${(value * 100).toFixed(1)}%`;
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
