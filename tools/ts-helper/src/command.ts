import path from 'node:path';
import { Command } from 'commander';
import assert from 'node:assert';
import TsHelper, { defaultConfig } from './core.js';
import { loadModules, writeJsConfig, checkMaybeIsJsProj, getPkgInfo } from './utils.js';

export interface CommandOption {
  version?: string;
  tsHelperClazz?: typeof TsHelper;
}

export default class Commander {
  program: Command;
  commands: Record<string, SubCommand>;
  tsHelperClazz: typeof TsHelper;

  constructor(options?: CommandOption) {
    this.commands = loadModules<SubCommand>(path.resolve(__dirname, './cmd'), true);
    this.tsHelperClazz = options?.tsHelperClazz || TsHelper;
    let version = options?.version;
    if (!version) {
      version = getPkgInfo(path.dirname(__dirname)).version;
    }
    this.program = new Command()
      .version(version!, '-v, --version')
      .usage('[commands] [options]')
      .option('-w, --watch', 'Watching files, d.ts would recreated while file changed')
      .option('-c, --cwd [path]', 'Egg application base dir (default: process.cwd)')
      .option('-C, --config [path]', 'Configuration file, The argument can be a file path to a valid JSON/JS configuration file.（default: {cwd}/tshelper.js')
      .option('-f, --framework [name]', 'Egg framework(default: egg)')
      .option('-o, --oneForAll [path]', 'Create a d.ts import all types (default: typings/ets.d.ts)')
      .option('-s, --silent', 'Running without output')
      .option('-i, --ignore [dirs]', 'Ignore watchDirs, your can ignore multiple dirs with comma like: -i controller,service')
      .option('-e, --enabled [dirs]', 'Enable watchDirs, your can enable multiple dirs with comma like: -e proxy,other')
      .option('-E, --extra [json]', 'Extra config, the value should be json string');
  }

  init(argv: string[]) {
    const { program, commands } = this;
    let executeCmd: string | undefined;

    // override executeSubCommand to support async subcommand.
    program.addImplicitHelpCommand = () => {};
    program.executeSubCommand = async function(argv, args, unknown) {
      const cwd = this.cwd || defaultConfig.cwd;
      const command = commands[executeCmd!];
      assert(command, executeCmd + ' does not exist');
      await command.run(this, { cwd, argv, args: args.filter(item => item !== this), unknown });
    };

    if (!argv.slice(2).length) {
      this.execute();
    } else {
      Object.keys(commands).forEach(cmd => {
        const subCommand = commands[cmd];
        const cmdName = subCommand.options ? `${cmd} ${subCommand.options}` : cmd;
        program.command(cmdName, subCommand.description)
          .action(command => executeCmd = command);
      });

      program.parse(argv);

      if (!executeCmd) {
        this.execute();
      }
    }
  }

  execute() {
    const { program } = this;
    const watchFiles = program.watch;
    const generatorConfig = {};
    program.ignore && program.ignore.split(',').forEach(key => (generatorConfig[key] = false));
    program.enabled && program.enabled.split(',').forEach(key => (generatorConfig[key] = true));

    const tsHelperConfig = {
      cwd: program.cwd || defaultConfig.cwd,
      framework: program.framework,
      watch: watchFiles,
      generatorConfig,
      configFile: program.config,
      ...(program.extra ? JSON.parse(program.extra) : {}),
    };

    // silent
    if (program.silent) {
      tsHelperConfig.silent = true;
    }

    if (checkMaybeIsJsProj(tsHelperConfig.cwd)) {
      // write jsconfig if the project is wrote by js
      writeJsConfig(tsHelperConfig.cwd);
    }

    // create instance
    const clazz = this.tsHelperClazz;
    const tsHelper = new clazz(tsHelperConfig).build();

    if (program.oneForAll) {
      // create one for all
      tsHelper.createOneForAll(program.oneForAll);
    }
  }
}

export { Command };
