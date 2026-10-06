---
title: Schedule shutdown timer cleanup
type: concept
summary: Timer strategies cancel pending timers on close so single-process applications can exit naturally.
source_files:
  - plugins/schedule/src/lib/strategy/timer.ts
  - plugins/schedule/src/lib/strategy/base.ts
  - plugins/schedule/src/lib/schedule.ts
  - plugins/schedule/src/agent.ts
  - packages/egg/src/lib/egg.ts
  - plugins/schedule/test/timer-close.test.ts
updated_at: 2026-10-06
status: active
---

# Schedule shutdown timer cleanup

Single-process application close already closes its agent. The schedule plugin's agent beforeClose hook invokes Scheduler.close(), which closes its strategies.

TimerStrategy owns pending native timeout, safe-timers long timeout, and immediate handles. It removes handles when callbacks run and cancels remaining handles on close. Both strategy and scheduler refuse to start again after close, preventing delayed serverDidReady work from reopening the scheduler.

Previously the inherited BaseStrategy.close() only set a flag; pending timers remained referenced. Inference: a closed flag prevents future dispatch but cannot establish natural process exit without cancelling pending resources.

Regression tests use child processes to check natural exit for interval, cron, long timeout, immediate, and real single-process application shutdown after HTTP or a readiness delay. Immediate close after start alone can miss the defect because serverDidReady runs asynchronously. The existing stop tests additionally check shutdown before and after interval dispatch for worker and all strategies.
