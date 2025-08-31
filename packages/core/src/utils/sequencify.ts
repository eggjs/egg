import { debuglog } from 'node:util';

const debug = debuglog('@eggjs/core/utils/sequencify');

export interface SequencifyResult {
  sequence: string[];
  requires: Record<string, true>;
}

export interface SequencifyTask {
  dependencies: string[];
  optionalDependencies: string[];
}

function sequence(
  // oxlint-disable-next-line max-params
  tasks: Record<string, SequencifyTask>,
  names: string[],
  result: SequencifyResult,
  missing: string[],
  recursive: string[],
  nest: string[],
  optional: boolean,
  parent: string
) {
  for (const name of names) {
    if (result.requires[name]) {
      continue;
    }
    const node = tasks[name];
    if (!node) {
      if (optional === true) {
        continue;
      }
      missing.push(name);
    } else if (nest.includes(name)) {
      nest.push(name);
      recursive.push(...nest.slice(0));
      nest.pop();
    } else if (
      node.dependencies.length > 0 ||
      node.optionalDependencies.length > 0
    ) {
      nest.push(name);
      if (node.dependencies.length > 0) {
        sequence(
          tasks,
          node.dependencies,
          result,
          missing,
          recursive,
          nest,
          optional,
          name
        );
      }
      if (node.optionalDependencies.length > 0) {
        sequence(
          tasks,
          node.optionalDependencies,
          result,
          missing,
          recursive,
          nest,
          true,
          name
        );
      }
      nest.pop();
    }
    if (!optional) {
      result.requires[name] = true;
      debug('task: %s is enabled by %s', name, parent);
    }
    if (!result.sequence.includes(name)) {
      result.sequence.push(name);
    }
  }
}

// tasks: object with keys as task names
// names: array of task names
export function sequencify(
  tasks: Record<string, SequencifyTask>,
  names: string[]
) {
  const result: SequencifyResult = {
    sequence: [],
    requires: {},
  }; // the final sequence
  const missing: string[] = []; // missing tasks
  const recursive: string[] = []; // recursive task dependencies

  sequence(tasks, names, result, missing, recursive, [], false, 'app');

  if (missing.length > 0 || recursive.length > 0) {
    result.sequence = []; // results are incomplete at best, completely wrong at worst, remove them to avoid confusion
  }

  return {
    sequence: result.sequence.filter(item => result.requires[item]),
    missingTasks: missing,
    recursiveDependencies: recursive,
  };
}
