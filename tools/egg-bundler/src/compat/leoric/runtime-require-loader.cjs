'use strict';

const RUNTIME_REQUIRE = 'globalThis.__RUNTIME_REQUIRE';

const TRANSFORMS = [
  {
    suffix: '/leoric/lib/drivers/mysql/index.js',
    replacements: [[/\brequire\s*\(\s*client\s*\)/g, `${RUNTIME_REQUIRE}(client)`]],
  },
  {
    suffix: '/leoric/lib/drivers/sqlite/pool.js',
    replacements: [[/\brequire\s*\(\s*options\.client\s*\)/g, `${RUNTIME_REQUIRE}(options.client)`]],
  },
  {
    suffix: '/leoric/lib/drivers/postgres/index.js',
    replacements: [[/\brequire\s*\(\s*(['"])pg\1\s*\)/g, `${RUNTIME_REQUIRE}('pg')`]],
  },
  {
    suffix: '/leoric/lib/drivers/postgres/type_parser.js',
    replacements: [[/\brequire\s*\(\s*(['"])pg-types\1\s*\)/g, `${RUNTIME_REQUIRE}('pg-types')`]],
  },
  {
    suffix: '/leoric/lib/drivers/sqljs/sqljs-connection.js',
    replacements: [[/\brequire\s*\(\s*(['"])sql\.js\1\s*\)/g, `${RUNTIME_REQUIRE}('sql.js')`]],
  },
  {
    suffix: '/leoric/lib/realm/index.js',
    replacements: [
      [
        /\brequire\s*\(\s*path\.join\s*\(\s*dir\s*,\s*entry\.name\s*\)\s*\)/g,
        `${RUNTIME_REQUIRE}(path.join(dir, entry.name))`,
      ],
    ],
  },
  {
    suffix: '/leoric/lib/migrations.js',
    replacements: [
      [/\brequire\s*\(\s*path\.join\s*\(\s*dir\s*,\s*name\s*\)\s*\)/g, `${RUNTIME_REQUIRE}(path.join(dir, name))`],
    ],
  },
];

// This catches expression arguments that were not covered by the known Leoric
// transforms. Literal CommonJS dependencies normally remain visible to
// @utoo/pack; the optional database packages above are deliberately rewritten so
// an application only needs to install the client it actually uses at runtime.
const DYNAMIC_REQUIRE = /\brequire\s*\(\s*(?!['"`])/;

module.exports = function leoricRuntimeRequireLoader(source) {
  this.cacheable?.();

  const resourcePath = String(this.resourcePath || '').replaceAll('\\', '/');
  const transform = TRANSFORMS.find(({ suffix }) => resourcePath.endsWith(suffix));
  if (!transform) return source;

  let output = String(source);
  for (const [pattern, replacement] of transform.replacements) {
    output = output.replace(pattern, replacement);
  }

  if (DYNAMIC_REQUIRE.test(output)) {
    throw new Error(
      `[@eggjs/egg-bundler] unsupported Leoric dynamic require remains in ${resourcePath}; ` +
        'update runtime-require-loader.cjs for this Leoric version',
    );
  }

  return output;
};
