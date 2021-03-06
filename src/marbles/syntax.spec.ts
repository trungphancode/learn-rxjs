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
} from 'jasmine-marbles';
import {delay, tap} from 'rxjs/operators';
import {defer, from, ReplaySubject, timer} from 'rxjs';
import {SubscriptionLog} from 'rxjs/internal/testing/SubscriptionLog';


describe('Jasmine-marbles', () => {
  it('should have 10ms per frame by default', () => {
    expect(time('-|')).toBe(10);
  });

  it('should ignore spaces around marbles in time()', () => {
    expect(time('  --| ')).toBe(time('--|'));
  });

  it('should ignore spaces around marbles in cold()', () => {
    expect(cold('  -x-y-| ')).toBeObservable(cold('-x-y-|'));
  });

  it('should ignore spaces around marbles in hot()', () => {
    expect(hot('  -x-y-| ')).toBeObservable(hot('-x-y-|'));
  });

  /** This may be a bug. */
  it('should NOT ignore spaces in subscription marbles', () => {
    const t1 = time('---|     '); // subscribedFrame
    const t2 = time('------|  '); // unsubscribedFrame
    const eSubs1 = ('---^--! '); // expected subscription marbles
    const eSubs2 = ('   ^--! '); // expected subscription marbles with leading spaces
    const eSubs3 = ('   ^  ! '); // expected subscription marbles with spaces
    const subscriptionLog = new SubscriptionLog(t1, t2);
    getTestScheduler().expectSubscriptions([subscriptionLog]).toBe(eSubs1);
    getTestScheduler().expectSubscriptions([subscriptionLog]).toBe(eSubs2);
    getTestScheduler().expectSubscriptions([subscriptionLog]).toBe(eSubs3);
  });

  it('cold observable dispatch based on subscription', () => {
    const observable = cold('x--y|    ');
    const observer01SubsM = '-^       ';
    const expected01 = cold('-x--y|   ');
    const observer02SubsM = '---^     ';
    const expected02 = cold('---x--y| ');
    const observableSubs = ['-^---!   ',
      /*                */  '---^---! '];
    getTestScheduler().expectObservable(observable, observer01SubsM).toBe(expected01.marbles, expected01.values);
    getTestScheduler().expectObservable(observable, observer02SubsM).toBe(expected02.marbles, expected02.values);
    getTestScheduler().expectSubscriptions(observable.getSubscriptions()).toBe(observableSubs);
  });

  it('hot observable dispatch based on subscription', () => {
    const observable = hot(' abcd|   ');
    const observer01SubsM = '-^      ';
    const expected01 = cold('-bcd|   ');
    const observer02SubsM = '---^    ';
    const expected02 = cold('---d|   ');
    const observableSubs = ['-^--!   ',
      /*                */  '---^!   '];
    getTestScheduler().expectObservable(observable, observer01SubsM).toBe(expected01.marbles, expected01.values);
    getTestScheduler().expectObservable(observable, observer02SubsM).toBe(expected02.marbles, expected02.values);
    getTestScheduler().expectSubscriptions(observable.getSubscriptions()).toBe(observableSubs);
  });

  it('should subscribe observable at the beginning when using expect()', () => {
    const observable = cold('-x-y|');
    expect(observable).toBeObservable(observable);
    expect(observable).toHaveSubscriptions('^---!');
  });

  it('should subscribe observable at specified subscription when using getTestScheduler().expectObservable()', () => {
    const observable = cold('-x-y|  ');
    const observableSubsM = '--^    ';
    const expectedOb = cold('---x-y|');
    const observableSubs = ['--^---!'];
    getTestScheduler().expectObservable(observable, observableSubsM).toBe(expectedOb.marbles, expectedOb.values);
    getTestScheduler().expectSubscriptions(observable.getSubscriptions()).toBe(observableSubs);
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

  it('should support flush to wait for all observables to complete', () => {
    let tapRun = 0;
    const o = cold('xyz|');
    getTestScheduler().expectObservable(o.pipe(tap(() => tapRun++))).toBe(o.marbles);
    getTestScheduler().flush();
    expect(tapRun).toBe(3);
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

  it('should record for non compatible stream', () => {
    const recorder = new ReplaySubject<string>(undefined, undefined, getTestScheduler());
    const o = cold('--1-2-3|').pipe(tap(v => recorder.next(`${v * 2}`)));
    getTestScheduler().expectObservable(o, '--^');
    getTestScheduler().expectObservable(recorder).toBe('----2-4-6');
  })

  it('should not test with Promise because Promise is async', () => {
    const promiseRecorder = new ReplaySubject<string>(undefined, undefined, getTestScheduler());
    const o = defer(() => from(Promise.resolve('v'))).pipe(tap(v => promiseRecorder.next(v)));
    getTestScheduler().expectObservable(o, '--^');
    // The following will fail
    // getTestScheduler().expectObservable(promiseRecorder).toBe('--v');
  });
});
