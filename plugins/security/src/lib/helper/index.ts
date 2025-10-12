import cliFilter from './cliFilter.ts';
import escape from './escape.ts';
import escapeShellArg from './escapeShellArg.ts';
import escapeShellCmd from './escapeShellCmd.ts';
import shtml from './shtml.ts';
import sjs from './sjs.ts';
import sjson from './sjson.ts';
import spath from './spath.ts';
import surl from './surl.ts';

const helpers: {
  cliFilter: typeof cliFilter;
  escape: typeof escape;
  escapeShellArg: typeof escapeShellArg;
  escapeShellCmd: typeof escapeShellCmd;
  shtml: typeof shtml;
  sjs: typeof sjs;
  sjson: typeof sjson;
  spath: typeof spath;
  surl: typeof surl;
} = {
  cliFilter,
  escape,
  escapeShellArg,
  escapeShellCmd,
  shtml,
  sjs,
  sjson,
  spath,
  surl,
};

export default helpers;
