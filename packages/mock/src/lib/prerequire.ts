// const debug = require('util').debuglog('egg-mock/prerequire');
// const path = require('path');
// const { existsSync } = require('fs');
// const globby = require('globby');

// const cwd = process.cwd();
// const dirs = [];
// if (existsSync(path.join(cwd, 'app'))) {
//   dirs.push('app/**/*.js');
// }
// // avoid Error: ENOENT: no such file or directory, scandir
// if (existsSync(path.join(cwd, 'config'))) {
//   dirs.push('config/**/*.js');
// }
// const files = globby.sync(dirs, { cwd });

// for (const file of files) {
//   const filepath = path.join(cwd, file);
//   try {
//     debug('%s prerequire %s', process.pid, filepath);
//     require(filepath);
//   } catch (err) {
//     debug('prerequire error %s', err.message);
//   }
// }
