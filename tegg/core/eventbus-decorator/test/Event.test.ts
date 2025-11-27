import { expect, test } from 'vitest';

import { EventInfoUtil } from '../src/index.ts';
import { EmptyHandler } from './fixtures/empty-handle.ts';
import { EventContextHandler } from './fixtures/event-handle-with-context.ts';
import { MultiHandler } from './fixtures/multiple-events-handle.ts';
import { FooHandler } from './fixtures/right-event-handle.ts';

test('getEventName should work', () => {
  expect(EventInfoUtil.getEventName(FooHandler)).toBe('foo');
  expect(EventInfoUtil.getEventName(EmptyHandler)).toBeUndefined();
});

test('getEventNameList should work', function () {
  const event = EventInfoUtil.getEventName(MultiHandler);
  expect(event).toBe('hello');
  const eventList = EventInfoUtil.getEventNameList(MultiHandler);
  expect(eventList).toEqual(['hi', 'hello']);
});

test('setEventName should work', function () {
  EventInfoUtil.setEventName('foo', EmptyHandler);
  expect(EventInfoUtil.getEventName(EmptyHandler)).toBe('foo');
  EventInfoUtil.setEventName('bar', EmptyHandler);
  expect(EventInfoUtil.getEventName(EmptyHandler)).toBe('bar');
});

test('getEventHandlerContextInject', function () {
  expect(EventInfoUtil.getEventHandlerContextInject(EventContextHandler)).toBe(true);
  expect(EventInfoUtil.getEventHandlerContextInject(FooHandler)).toBe(false);
});
