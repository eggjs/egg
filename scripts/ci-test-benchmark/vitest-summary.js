import path from 'node:path';

export function summarizeVitest(vitestJson, topLimit) {
  const testResults = Array.isArray(vitestJson?.testResults) ? vitestJson.testResults : [];
  const files = testResults.map((result) => summarizeFileResult(result)).sort((a, b) => b.durationMs - a.durationMs);
  const projects = summarizeProjects(files).sort((a, b) => b.durationMs - a.durationMs);

  return {
    files,
    longTailFiles: files.slice(0, topLimit),
    longTailProjects: projects.slice(0, topLimit),
    parallelism: computeParallelism(files),
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
  const interval = getInterval(result);
  return {
    durationMs: getDurationMs(result),
    endMs: interval.endMs,
    failedTests: assertions.filter((assertion) => assertion.status === 'failed').length,
    file: normalizeFilePath(filePath),
    passedTests: assertions.filter((assertion) => assertion.status === 'passed').length,
    pendingTests: assertions.filter((assertion) => assertion.status === 'pending' || assertion.status === 'skipped')
      .length,
    project: result.projectName ?? inferProjectName(filePath),
    startMs: interval.startMs,
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

// Absolute wall-clock interval (epoch ms) for a file's run, used to reconstruct the
// concurrency timeline. The Vitest 4 JSON reporter derives a file's startTime/endTime
// from TEST-level timings only (min test start .. max test end), so the interval covers
// test bodies + per-test beforeEach/afterEach but EXCLUDES suite-level beforeAll/afterAll
// (where egg boots its apps — often the dominant per-file cost) and module
// transform/import. Metrics built from it are lower bounds for beforeAll-heavy suites.
function getInterval(result) {
  if (
    typeof result.startTime === 'number' &&
    typeof result.endTime === 'number' &&
    result.endTime >= result.startTime
  ) {
    return { endMs: result.endTime, startMs: result.startTime };
  }
  if (
    typeof result.perfStats?.start === 'number' &&
    typeof result.perfStats?.end === 'number' &&
    result.perfStats.end >= result.perfStats.start
  ) {
    return { endMs: result.perfStats.end, startMs: result.perfStats.start };
  }
  return { endMs: null, startMs: null };
}

// Derive single-run parallelism efficiency metrics from per-file intervals.
// - executionWindowMs: max(end) - min(start) across all files (the wall-clock span
//   during which Vitest was executing test files).
// - busyTimeMs: sum of per-file spans; equals the area under the concurrency curve.
// - avgConcurrency: busyTimeMs / executionWindowMs (time-weighted mean number of
//   files executing concurrently).
// - peakConcurrency: max number of files whose intervals overlap (sweep line).
// - criticalPathMs: longest single-file span (theoretical wall-clock floor).
// Zero-width intervals (end <= start) are dropped: a fully-skipped file has no test
// timings, so the reporter anchors it at the reporter-init timestamp (before worker
// warmup), which would otherwise stretch the execution window and deflate concurrency.
function computeParallelism(files) {
  const intervals = files
    .filter((file) => typeof file.startMs === 'number' && typeof file.endMs === 'number' && file.endMs > file.startMs)
    .map((file) => ({ end: file.endMs, file: file.file, start: file.startMs }));

  if (intervals.length === 0) {
    return {
      avgConcurrency: null,
      busyTimeMs: 0,
      criticalPathFile: null,
      criticalPathMs: 0,
      executionWindowMs: null,
      fileCount: 0,
      peakConcurrency: 0,
    };
  }

  const firstStart = Math.min(...intervals.map((interval) => interval.start));
  const lastEnd = Math.max(...intervals.map((interval) => interval.end));
  const executionWindowMs = Math.max(0, Math.round(lastEnd - firstStart));
  const busyTimeMs = Math.round(intervals.reduce((total, interval) => total + (interval.end - interval.start), 0));

  // Sweep line: process ends before starts at equal timestamps so an interval that
  // ends exactly when another starts is treated as a hand-off, not an overlap.
  const events = [];
  for (const interval of intervals) {
    events.push({ delta: 1, time: interval.start });
    events.push({ delta: -1, time: interval.end });
  }
  events.sort((a, b) => a.time - b.time || a.delta - b.delta);
  let current = 0;
  let peakConcurrency = 0;
  for (const event of events) {
    current += event.delta;
    if (current > peakConcurrency) {
      peakConcurrency = current;
    }
  }

  const critical = intervals.reduce(
    (longest, interval) => {
      const span = interval.end - interval.start;
      return span > longest.span ? { file: interval.file, span } : longest;
    },
    { file: null, span: -1 },
  );

  return {
    avgConcurrency: executionWindowMs > 0 ? busyTimeMs / executionWindowMs : null,
    busyTimeMs,
    criticalPathFile: critical.file,
    criticalPathMs: Math.max(0, Math.round(critical.span)),
    executionWindowMs,
    fileCount: intervals.length,
    peakConcurrency,
  };
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
