import { DEFAULT_COMMAND, VITEST_JSON_PLACEHOLDER } from './constants.js';

const BOOLEAN_COMMAND_OPTIONS = new Set(['--isolate', '--no-isolate']);

export function buildCommand(commandArgs, options, vitestJsonPath) {
  const command = commandArgs.length > 0 ? [...commandArgs] : [...DEFAULT_COMMAND];
  if (options.coverage && commandArgs.length === 0) {
    command.push('--coverage');
  }

  const replaced = command.map((arg) => arg.replaceAll(VITEST_JSON_PLACEHOLDER, vitestJsonPath));
  if (!options.appendVitestJsonReporter) {
    return replaced;
  }

  const reporterArgs = [];
  if (!hasJsonReporter(replaced)) {
    reporterArgs.push('--reporter=json');
  }
  if (!hasVitestOutputFile(replaced)) {
    reporterArgs.push(`--outputFile=${vitestJsonPath}`);
  }
  return reporterArgs.length === 0 ? replaced : [...replaced, ...reporterArgs];
}

export function extractCommandParameters(command) {
  return {
    coverage: command.some((arg) => arg === '--coverage' || arg.startsWith('--coverage=')),
    hookTimeout: collectOptionValues(command, ['--hookTimeout']),
    isolate: collectOptionValues(command, ['--isolate', '--no-isolate']),
    pool: collectOptionValues(command, ['--pool']),
    reporter: collectOptionValues(command, ['--reporter']),
    retry: collectOptionValues(command, ['--retry']),
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

export function shellJoin(command) {
  return command.map((arg) => (arg.includes(' ') ? JSON.stringify(arg) : arg)).join(' ');
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

function collectOptionValues(command, names) {
  const values = [];
  for (let index = 0; index < command.length; index++) {
    const arg = command[index];
    for (const name of names) {
      if (arg === name) {
        values.push({ name, value: getSeparatedOptionValue(name, command[index + 1]) });
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
