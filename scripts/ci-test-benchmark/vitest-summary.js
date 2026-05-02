import path from 'node:path';

export function summarizeVitest(vitestJson, topLimit) {
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
