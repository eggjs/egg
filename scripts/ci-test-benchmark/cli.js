import { DEFAULT_TOP_LIMIT, VITEST_JSON_PLACEHOLDER } from './constants.js';

export function printHelp() {
  console.log(`
Usage:
  ut run benchmark:ci-test
  ut run benchmark:ci-test -- --coverage
  ut run benchmark:ci-test -- --output-dir .tmp/bench -- ut execute vitest run --maxWorkers=4
  ut run benchmark:ci-test -- --report-only --vitest-json benchmark/ci-test/ci-run/vitest-results.json

Options:
  --output-dir <dir>                 Directory for report.md, report.json, and raw Vitest JSON.
  --name <label>                     Human-readable benchmark label.
  --top <n>                          Number of long-tail files/projects to include. Default: ${DEFAULT_TOP_LIMIT}.
  --coverage                         Append --coverage to the default Vitest command.
  --no-append-vitest-json-reporter   Do not append --reporter=json/--outputFile to the command.
  --report-only                      Build the report from an existing Vitest JSON without running tests.
  --vitest-json <path>               Existing Vitest JSON to summarize (implies --report-only).
  --dry-run                          Generate reports without executing the test command.
  --help                             Show this help.

When GITHUB_STEP_SUMMARY is set, the Markdown report is also appended to the GitHub Actions job summary.

Custom command:
  Arguments after -- replace the default command. The script appends Vitest JSON reporter args by default.
  Use ${VITEST_JSON_PLACEHOLDER} inside a custom command arg if the output path must be embedded manually.
`);
}

export function parseArgs(argv) {
  argv = normalizePackageManagerArgv(argv);
  const options = {
    appendVitestJsonReporter: true,
    coverage: false,
    dryRun: false,
    name: 'CI test benchmark',
    outputDir: '',
    reportOnly: false,
    top: DEFAULT_TOP_LIMIT,
    vitestJson: '',
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
    if (arg === '--report-only') {
      options.reportOnly = true;
      continue;
    }
    if (arg === '--vitest-json') {
      options.vitestJson = readOptionValue(argv, ++index, arg);
      options.reportOnly = true;
      continue;
    }
    if (arg.startsWith('--vitest-json=')) {
      options.vitestJson = arg.slice('--vitest-json='.length);
      options.reportOnly = true;
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
