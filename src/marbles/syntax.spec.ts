/**
 * Demonstrates how marbles are used.
 * @see https://github.com/ReactiveX/rxjs/blob/master/docs_app/content/guide/testing/marble-testing.md
 */

import {
  cold,
  getTestScheduler,
  hot,
  initTestScheduler,
  resetTestScheduler,
  time
} from "jasmine-marbles";
import {delay, tap} from "rxjs/operators";
import {timer} from "rxjs";


describe('Jasmine-marbles', () => {
  it('should have 10ms per frame by default', () => {
    expect(time('-|')).toBe(10);
  });

  it('should support time progression syntax for cold', () => {
    const o = cold('---x-y|');
    const e = cold('30ms x 10ms y|');
    expect(o).toBeObservable(e);
  });

  it('should support time progression syntax for hot', () => {
    const o = hot('---x-y|');
    const e = hot('30ms x 10ms y|');
    expect(o).toBeObservable(e);
  });

  it('should support expecting marble string for easier debugging', () => {
    const o = cold('---x-y|');
    getTestScheduler().expectObservable(o).toBe('---x-y|');
  });

  it('should support expecting cold subscription', () => {
    const x = cold('---x-y|');
    const o = x.pipe(tap(v => {
    }));
    expect(o).toBeObservable(x); // This will subscribe x
    expect(x).toHaveSubscriptions('^-----!');
  });

  it('should support expecting hot subscription', () => {
    const x = hot('---x-y|');
    const o = x.pipe(tap(v => {
    }));
    expect(o).toBeObservable(x); // This will subscribe x
    expect(x).toHaveSubscriptions('^-----!');
  });

  it('should support expecting no subscription', () => {
    const o = cold('x-y|');
    expect(o).toHaveSubscriptions([]); // o is never subscribed
  });

  it('should support test scheduler for async timer()', () => {
    const o = timer(30, getTestScheduler());
    const e = cold('30ms (0|)', {'0': 0});
    expect(o).toBeObservable(e);
  });

  it('should support test scheduler for async delay()', () => {
    const o = cold('x|').pipe(delay(10, getTestScheduler()));
    const e = cold('10ms x|');
    expect(o).toBeObservable(e);
  });
});

describe('Jasmine-marble tests', () => {
  it('should avoid mixing ms with frame', () => {
    // if use ms, then expect with time progression
    expect(timer(13, getTestScheduler()))
        .toBeObservable(cold('13ms (0|)', {'0': 0}));
    resetTestScheduler();
    initTestScheduler();
    // if use time(), then expect with frame to avoid assuming 10ms / frame
    expect(timer(time('--|'), getTestScheduler()))
        .toBeObservable(cold('--(0|)', {'0': 0}));
  });
});
