
interface SubCommandOption {
  cwd: string;
  argv: string[];
  args: string[];
  unknown: string[];
}

interface SubCommand {
  // [key: string]: any;
  description: string;
  options?: string;
  run(program: Command, option: SubCommandOption): Promise<void>;
}
