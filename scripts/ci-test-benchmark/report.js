import { shellJoin } from './command.js';
import { writeJson, writeText } from './fs.js';
import { summarizeVitest } from './vitest-summary.js';

export function createReport({ command, environment, name, outputFiles, run, topLimit, vitestJson }) {
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

export async function writeReports(report, reportJsonPath, reportMarkdownPath) {
  await Promise.all([writeJson(reportJsonPath, report), writeText(reportMarkdownPath, renderMarkdown(report))]);
}

function renderMarkdown(report) {
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
    shellJoin(report.command),
    '```',
    '',
    '## Run',
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

  appendLongTailTables(lines, vitest);
  appendOutputSection(lines, report);
  return `${lines.join('\n')}\n`;
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
    '## GitHub Actions Artifact',
    '',
    'This command does not change required checks or CI gate semantics. To collect it in a manual workflow, run the benchmark command and upload the output directory as an artifact.',
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
