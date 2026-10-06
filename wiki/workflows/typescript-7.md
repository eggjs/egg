---
title: TypeScript 7 migration and compatibility tools
type: workflow
summary: Native TypeScript 7 checks with an explicit entrypoint and an intentional TypeScript 5 API compatibility layer.
source_files:
  - .utoo.toml
  - package.json
  - scripts/check-package.mjs
  - scripts/test/check-package.test.js
  - tsdown.config.ts
  - .github/workflows/ci.yml
  - packages/egg/src/index.ts
  - tegg/plugin/orm/tsconfig.typecheck.json
  - tegg/core/langchain-decorator/tsconfig.typecheck.json
  - tegg/standalone/service-worker/tsconfig.typecheck.json
  - tools/create-egg/src/templates/simple-ts/package.json
  - tools/create-egg/src/templates/tegg/package.json
  - .gitignore
  - https://registry.npmjs.org/typescript
  - https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
updated_at: 2026-10-06
status: active
---

## Compiler selection

Task 07 started from clean detached commit `a11a6d50`. npm's `latest` tag was
verified as 7.0.2 on 2026-10-06 (next was 7.1.0-dev.20261005.1).
The default `.utoo.toml` TypeScript catalog is `^7.0.2`. Root
`@typescript/native` aliases the same TS7 package so the root checker can coexist
with the SWC compiler API dependency.
Workspace typecheck scripts use `tsc --noEmit`. A fresh native utoo dependency
resolution was verified to link `.bin/tsc` to TS7.0.2. The former explicit-path
wrapper has been deleted. Egg 4 templates and the standalone HTTP benchmark use
`typescript@^7.0.2` directly and plain `tsc`; Egg 3 templates remain unchanged.

Only the root and egg-bin compatibility tests opt into
`typescript: catalog:compiler-api` (`^5.9.3`) for SWC's compiler API. The current
`@swc-node/register@1.12.1` declares `typescript >=4.3 <7` and reads
`ts.ScriptTarget.ES2018`; replacing its API dependency with TS7 reproduces a
TypeError. This compatibility dependency is separate from the TS7 checker.
Templates using the default Oxc loader do not need the old API dependency.

## Toolchain audit

The ignored local package-lock.json was regenerated with utoo; the repository
ignores lockfiles and has no tracked root lockfile to update. Actual installed
versions in this verification were:

| Tool                | Version  | Compiler/API use and migration decision                                                             |
| ------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| Native TypeScript   | 7.0.2    | All 87 workspace typecheck scripts, including three examples                                        |
| TypeScript API      | 5.9.3    | Intentional compatibility dependency, not a stray duplicate compiler                                |
| tsdown              | 0.18.4   | Peer requires TS ^5; retained to preserve current packaging workflow                                |
| rolldown-plugin-dts | 0.20.0   | TS ^5 API path; isolated declarations can use Oxc; legacy native-preview peer is optional           |
| @swc-node/register  | 1.12.1   | Peer requires TS >=4.3 <7 and reads TS configuration; retain API 5                                  |
| ts-node             | 10.9.2   | Loads compiler API; used by egg-bin custom compiler and core explicit typecheck compatibility tests |
| tsx                 | 4.23.15  | Uses esbuild/config resolution; no TS compiler peer                                                 |
| Vite                | 7.3.1    | esbuild transform; no TS compiler peer                                                              |
| Vitest              | 5.0.3    | Vite runtime tests; no TS compiler peer                                                             |
| oxlint              | 1.87.0   | Native lint, paired with compatible typed engine                                                    |
| oxlint-tsgolint     | 7.0.2003 | Native typed lint; catalog upgraded from incompatible 0.18.1                                        |

These versions/peers were inspected from installed package manifests and local
lock metadata, not inferred from third-party development dependencies.
Legacy tools/scripts/bin/dev.js and dev.cmd also reference the ts-node ESM loader and retain the same compatibility API.

No installed tsd package was found: historical changelog mentions and transitive
packages' published devDependencies do not indicate an active repository tsd run.
No extra installed old TypeScript versions were found in the final lock audit.
Fixture TS 5 declarations (`packages/core/test/fixtures/helloworld-ts`) and
vendored tsconfig-paths fixture metadata are retained compatibility inputs.
Wildcard TS fixture dependencies are not workspace install roots.

A trial of tsdown 0.23 supported newer peers but removed `publint.pack`, selecting
pnpm automatically and failing to pack utoo's workspace layout. It was reverted.
Replacing SWC/ts-node paths with Oxc/tsx is a future runtime migration, not a safe
peer override. Moving the API layer to TS 6 requires a compatible tsdown release
and a verified packaging workflow first.

## Source adjustments

Egg directly re-exports `EggAppConfig as Config`, preserving both runtime value
and type without TS 7's TS9026 failure for the previous alias declarations.
Existing Config/export and config-factory tests passed, and the generated
index.d.ts contains the merged re-export.

Imported MCP and standalone fixtures now carry explicit return types.
ORM, LangChain, and service-worker use dedicated no-emit typecheck configurations
with isolatedDeclarations disabled for inferred runtime fixtures. Their publish
build configurations retain isolatedDeclarations. A filesystem mock uses
Reflect.apply for overloaded readFileSync. MCP request types use type-only
imports; a test loads the build configuration by URL to avoid composite project
membership errors.

## Local verification and limits

Node 26.1.0, macOS arm64. Final direct execution of all **87** workspace typecheck
scripts passed. oxfmt check, typed oxlint with type checking, and git diff check
passed. The root `ut run typecheck` wrapper failed because installed utoo 1.1.10
reported `clean` not found during workspace dispatch; direct scripts were used
for complete coverage. This runner issue remains unresolved.

The full main Vitest run with bail 1 stopped on the DAL plugin assertion:
132 files passed, 1 failed, 6 skipped; 1061 tests passed, 1 failed, 98 skipped.
The same DAL test passed in a later isolated run; full-suite state interference
is suspected, not established. The full suite is not recorded as passing.

Affected core/onerror/create-egg/dal-runtime tests: 66 passed, 6 skipped.
Final Egg Config, config factory, DAL, MCP client and standalone tests:
15 passed across 5 files. Egg-bin independent suite initially had 3 failures,
99 passed, 39 skipped; stale fixture scan manifests referenced removed dist
classes. After clearing fixture .egg caches, the affected command-test file
passed all 27 active tests (5 skipped). The entire independent suite was not
rerun after this cleanup.

Full tsdown build and publint passed with existing sideEffects suggestions.
TypeScript and tegg example builds generated JS and declarations successfully.
The final Egg change was rebuilt separately and publint passed. Build-generated
manifest changes were removed from the task diff; generated dist was cleaned.

## Performance sample

Same machine, same packages/utils/tsconfig.json, alternating TS 5.9.3 and TS 7.0.2,
three runs each. Every run started a fresh process and removed its tsbuildinfo.
OS filesystem cache was not flushed; these are warm filesystem, cold compiler
process measurements. All six checks passed. Seconds:

| Run | TS 5.9.3 | TS 7.0.2 |
| --- | -------- | -------- |
| 1   | 0.3353   | 0.0840   |
| 2   | 0.3342   | 0.0849   |
| 3   | 0.3454   | 0.0866   |

This small-project sample does not predict whole-repository or CI speedups.
After 07 is integrated, the final 02 release rehearsal must rerun typechecks,
full tests, independent CLI suites, builds, declaration/package checks, and
consumer/example installation validation against the integrated state.

## Retry after 02a, 2026-10-06

The completed 02a migration is commit `ff3eb1c0cc10508c3e7463ed7f402dfcadd42ae5`.
Its raw package.json, .utoo.toml, pnpm-workspace.yaml and ecosystem-ci/pack-all.mjs
were read directly from Git. Only workspace/override/package-manager fields and
catalogs were temporarily overlaid onto the 07 worktree; no merge, cherry-pick,
other task changes, push or PR was performed. The 07 native compiler and typed
lint entries were preserved in that overlay.

With utoo 1.1.10's native configuration, root `ut run typecheck` and typed lint
both passed. This resolves the earlier root dispatch blocker for the integrated
02a configuration. It is not a claim that the pre-02a root configuration changed.

npm stable tsdown was again verified as 0.23.0. After removing its unsupported
publint.pack option, full tsdown build produced 84 completed library builds and
84 pack failures (process exit 1). Each pack failed because the bundled package
manager detector selected pnpm from the retained legacy pnpm-workspace.yaml;
pnpm refused the root packageManager `utoo@1.1.10`. The detector does not list
utoo among supported package managers. Thus 02a alone does not fix tsdown's
internal packing selection.

Using the exact 02a ecosystem-ci/pack-all.mjs script with an explicit UT_BIN
successfully packed all 85 publishable packages. Every archived package.json was
checked: no workspace: or catalog: dependencies remained. The publint API was
then run against all 85 tarball buffers with strict:true and level:suggestion:
zero errors. This establishes that declaration generation and explicit utoo
packing work; it does not make tsdown's default build/publint path pass.

Related export/config/template/dal-runtime tests on the trial dependency tree:
5 files passed, 26 tests passed, 2 skipped. The minimal remaining integration is
to disable tsdown's automatic publint packing and run a separate explicit utoo
pack + publint check, or obtain upstream support for selecting utoo. Removing
the legacy pnpm workspace merely to influence detection was not tested or saved.

The trial configuration, generated exports, tarballs and dist directories were
restored/removed; dependencies returned to tsdown 0.18.4. Existing 07 edits are
preserved. The retry monitor was paused after this attempt. Final 02 release
rehearsal still needs to rerun after 07 and 02a integration.

## Persistent tsdown upgrade

The retained diff now upgrades the tsdown catalog to ^0.23.0. The earlier rollback
applied only to the temporary tsdown experiment; the TS 7 changes always remained.
The root tsdown configuration disables its internal automatic publint pack step
and uses build:done to call scripts/check-package.mjs for every built public
package. This also runs for filtered builds without changing CLI arguments.

The checker snapshots workspace versions/catalogs before the parallel build,
resolves publication dependencies and publishConfig fields through the existing
scripts/utils.js helpers, copies the package to a temporary directory, invokes
installed utoo's JavaScript pm-pack entrypoint, and checks the resulting tarball
buffer with strict publint. Validation errors propagate to the build. The source
manifest is never rewritten by this checker; temporary copies are removed on
success or failure. Existing source tarballs are untouched. This avoids both
package-manager auto-detection and manifest races between parallel builds.

Four regression tests cover protocol/publishConfig resolution, pack failure,
validation failure, cleanup and preservation of source files/tarballs. CI runs
them with node --test scripts/test/check-package.test.js.

Persistent-upgrade validation: full tsdown build passed with 83 public built
packages checked by the hook. The two excluded config/Markdown packages
(@eggjs/tsconfig and @eggjs/skills) were checked separately, for 85 checked public
packages in total. Filtered egg-bin and egg-scripts builds both passed and logged
their utoo tarball checks. Both TypeScript and tegg example builds passed with
JS/declaration output. Root typecheck passed under the exact 02a native workspace
configuration overlay; typed lint passed.

The full source test suite with two retries stopped on a DNS-cache test expecting
ENOTFOUND but receiving SocketError: 196 files passed, one failed, eight skipped;
1373 tests passed, one failed, 117 skipped. An isolated retry with process proxy
variables cleared still failed that assertion and an address-rotation timeout.
No DNS behavior was changed by this task; these remain unresolved verification
limits, not established baseline failures. Directly affected tests are recorded
separately below.

TS 5.9.3 remains the deliberately tested API compatibility layer for SWC,
ts-node and legacy compiler fixtures. New tsdown supports TS 5/6/7 peers, but
that does not supply the stable compiler API absent from TS 7. A TS 6 API-layer
migration has not been validated and is not required for native TS 7 checks.

This worktree is based on the pre-02a commit, so its persistent catalog edits are
in pnpm-workspace.yaml. When integrating with 02a, carry the same three values
into authoritative .utoo.toml (do not overwrite its other migrated settings):
@typescript/native = npm:typescript@^7.0.2, oxlint-tsgolint = ^7.0.2003,
tsdown = ^0.23.0. The native overlay used these exact values for validation.
The scripts/utils.js functions consumed by the checker retain the same contract
in 02a and read its native catalogs after integration. Other 02a files were not
merged into the retained diff. Final 02 release rehearsal still must rerun on
the integrated state.

Final affected runtime tests: 7 files passed, 71 tests passed, 6 skipped.
Independent egg-bin suite: 13 files passed, one skipped; 102 tests passed,
39 skipped. Four package-check regression tests passed. Final source cleanup
restored build-generated manifest fields and the temporary native configuration
overlay; the tsdown 0.23 catalog, hook, checker, tests and CI step remain.

## ts-node removal (2026-10-06)

This supersedes the earlier audit's framework ts-node retention. Egg-bin no
longer declares ts-node as a dependency, and the tracked catalog entry is removed.
Both egg-bin and egg-scripts development entrypoints use
`--import @oxc-node/core/register`; egg-scripts declares Oxc as a development
dependency. Windows development wrappers now point to the actual `dev.js` file.

Plain JavaScript ESM apps receive no automatic TypeScript loader. Default TS
apps use Oxc's combined CJS/ESM registration. Explicit legacy CJS compilers
retain their register hook and use Oxc for the ESM side instead of an implicit
ts-node installation. `TS_NODE_FILES` is set only for an explicitly selected
ts-node compiler. The custom compiler interface remains supported; applications
selecting ts-node must install it themselves. Its explicit compatibility fixture
therefore retains its own dependency; historical changelogs and vendored fixture
metadata are not active framework dependencies.

The cluster fixture uses Oxc, obsolete ts-node configuration sections are removed,
and two previously skipped core ts-node type-check cases are deleted. The skipped
cluster multiple-require fixture now uses a local marker hook without a compiler
dependency. Type checking remains the native TS7 command, separate from runtime
transpilation. TS5 API compatibility is still needed by SWC and other API consumers.

Verification: egg-bin suite 102 passed / 39 skipped; three new ESM initialization
regressions (plain JS, Oxc, explicit SWC) plus existing custom compiler initialization
pass (4 tests).
Egg-scripts focused tests passed (6). Core TS loading and decorator tests passed
(28 passed / 2 skipped). Type-aware lint, focused TS7 checking and repository
format checks passed. Both CLI builds, declarations and utoo
publint tarball validation passed. Development entrypoint help smoke checks passed
using their executable shebangs. The initial sandboxed service tests failed with
listen EPERM; rerunning with local-service access passed.

Source files: tools/egg-bin/src/baseCommand.ts, tools/egg-bin/package.json,
tools/egg-bin/bin/dev.js, tools/egg-bin/bin/dev.cmd, tools/scripts/package.json,
tools/scripts/bin/dev.js, tools/scripts/bin/dev.cmd,
tools/egg-bin/test/commands/test-tscompiler.test.ts, packages/core/test/egg-ts.test.ts,
packages/cluster/test/master/others.test.ts, pnpm-workspace.yaml.

When integrating with 02a's native catalog, also remove its ts-node catalog entry.
After integrating 07, rerun the 02 stable-release rehearsal.

## Expanded local CI and cnpmcore verification (2026-10-06)

Environment: macOS arm64, Node 24.21.0 for the main CI/consumer runs; cnpmcore
checks used the exact ecosystem-ci/repo.json commit
9dbac59b086a94765a24a072ab8c22603fc58807 with all 85 current workspace tarballs
substituted by the existing patch-project.ts. Its npm dependency tree contains
no ts-node. Dedicated local services used MySQL 8 and Redis 7 on 13306/16379;
the GitHub E2E job's MySQL 5.7/Linux environment and the remote OS/Node matrix
were not reproduced. No workflow was dispatched and no code was pushed.

Local checks passed: all 87 workspace typecheck scripts; type-aware lint and
format; 9 CI/package guard tests; full library build/declarations/85 tarballs;
site build; tegg adapter isolated/shared workers (12 tests each); three runnable
workspace examples (8 tests); egg-bin full coverage (105 passed / 39 skipped);
egg-scripts full coverage (38 passed / 38 skipped).

The final complete main test + coverage run passed: 562 files passed / 22 skipped,
3677 tests passed / 274 skipped, line coverage 82.86%. It used the original
assertions, the main command's 20-second timeout, cleared proxy environment,
temporarily disabled Surge Enhanced Mode, and an exact-source-restored ORM
fixture port override into prepared isolated test databases. Surge was restored
in finally. The earlier full run failed on missing ORM databases and two DNS
ENOTFOUND assertions; these are resolved environment conditions for this local run.
See local-ci.md for the process-suite concurrency and proxy boundaries.

cnpmcore is NOT established green: three complete runs all had one failing file.
Runs 1 and 3 each had 1023 passed / 1 failed / 11 skipped / 2 todo, with a
TeamController beforeEach failing user creation or authorization with HTTP 401.
Run 2 had 1022 passed / 2 failed / 11 skipped / 2 todo in BinarySyncer executeTask,
starting with a 60-second timeout and cascading cleanup failure. TeamController
alone passed all 76 tests and BinarySyncer alone passed all 6. These retries show
intermittence, not an established upstream baseline or proof that the upgrade is
unrelated. The stable full-consumer test result remains an integration blocker.
No consumer assertions or production authentication behavior were changed.

cnpmcore typecheck, build and prepublish compilation passed. A second isolated
checkout passed the ordinary compiled deployment HTTP 200 check, V8 snapshot
build, snapshot restore and /-/ping HTTP 200 check, using unique process titles
and stopping both servers afterward. These successes do not supersede the full
consumer test failures. After integrating 07 with 02a, rerun the 02 stable-release
rehearsal and the actual CI/E2E matrix.

## PR integration onto current next (2026-10-06)

02a is now merged as f390cc01 (#6057). This branch is rebased onto that next
commit and upgrades the tracked authoritative .utoo.toml: native TS7 alias,
oxlint-tsgolint and tsdown; the ts-node catalog entry is removed. The legacy
pnpm-workspace.yaml stays unchanged. Earlier pre-02a catalog/overlay notes above
are historical validation records, not the final configuration source.
The contributor example now lives in tegg/AGENTS.md after #6060. The upstream
onerror test's typed rest tuple supersedes this task's earlier Reflect.apply fix.

Post-rebase verification: native `ut run typecheck` passed across all workspaces;
`ut run build` passed with declarations and 83 public package hook validations.
CI/package/release guard tests passed (14); focused onerror, schedule shutdown and
DAL generation regressions passed on Node 24 (50). The newly merged schedule
fixture router/task needed explicit return annotations for isolated declarations.
Type-aware lint and format passed. The earlier complete CI/consumer evidence above
was collected before rebasing; the remote matrix and full consumer stability still
require verification on the final branch.

The package validation regression suite runs through the root prebuild script, so
CI executes it before tsdown without requiring a workflow change.

The legacy pnpm-workspace.yaml was deleted after native configuration migration.
The workspace guard executes `tsc --version` using each workspace's local and
ancestor bin paths and rejects a compiler outside TS7, preventing a same-name
TS5 executable from silently replacing the native checker.
