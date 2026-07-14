export * from './ServiceWorkerApp.ts';
// Re-export the fetch event so embedded callers can build one without reaching
// into @eggjs/service-worker-controller.
export { FetchEventImpl } from '@eggjs/service-worker-controller';
