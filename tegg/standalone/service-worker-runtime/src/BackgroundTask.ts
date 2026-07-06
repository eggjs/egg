// Re-exported so the module scan picks BackgroundTaskHelper up as a member of
// this module — service worker contexts then support `@Inject()
// backgroundTaskHelper` with ctx-destroy-time draining out of the box. The
// host must provide `logger` and `config` inner objects (ServiceWorkerApp
// does).
export { BackgroundTaskHelper } from '@eggjs/background-task';
