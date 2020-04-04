/**
 * Demonstrates how observables are created.
 * @see https://rxmarbles.com
 * @see https://github.com/ReactiveX/rxjs/tree/master/spec/observables
 */
import {cold, getTestScheduler, hot, time} from 'jasmine-marbles';
import {
  combineLatest,
  concat,
  defer,
  forkJoin,
  iif,
  merge,
  of,
  onErrorResumeNext,
  race,
  timer,
  zip
} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {advanceTime} from "../testing/scheduler";


describe('Creation operator of()', () => {
  it('should emit all values at once', () => {
    const o = of('x', 'y', 'z');
    const e = cold('(xyz|)');
    expect(o).toBeObservable(e);
  });
});

describe('Creation operator merge()', () => {
  it('should emit both observables in parallel', () => {
    const x = cold('-x-y-z-|');
    const y = cold('a-b|    ');
    const o = merge(x, y);
    const e = cold('axby-z-|');
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions('^------!');
    expect(y).toHaveSubscriptions('^--!');
  });
});

describe('Creation operator concat()', () => {
  it('should finish one flow before starting another', () => {
    const x = cold('-a-b-|    ');  // must be finite for y to subscribe
    const y = cold('     -c-d|');
    const o = concat(x, y);
    const e = cold('-a-b--c-d|');
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions('^----!');
    expect(y).toHaveSubscriptions('-----^---!');
  });
});

describe('Creation operator onErrorResumeNext()', () => {
  it('should continue with next flow without error', () => {
    const x = cold('-a-b-#    ');  // must be finite for y to subscribe
    const y = cold('     -c-d#');
    const o = onErrorResumeNext(x, y);
    const e = cold('-a-b--c-d|');
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions('^----!');
    expect(y).toHaveSubscriptions('-----^---!');
  });
});

describe('Creation operator combineLatest()', () => {
  it('should wait until each flow emits at least once and finish when all flows finish', () => {
    const x = cold('-x-y-z-|');
    const y = cold('--a-b|    ');
    const o = combineLatest([x, y]).pipe(map(([x, y]) => `${x}${y}`));
    const e = cold('--ABCD-|', {A: 'xa', B: 'ya', C: 'yb', D: 'zb'});
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions('^------!');
    expect(y).toHaveSubscriptions('^----!');
  });

  it('should be able to use like operator', () => {
    const x = cold('-x-y-z-|');
    const y = cold('--a-b|    ');
    const o = x.pipe(
        stream => combineLatest([stream, y]),
        map(([x, y]) => `${x}${y}`),
    );
    const e = cold('--ABCD-|', {A: 'xa', B: 'ya', C: 'yb', D: 'zb'});
    expect(o).toBeObservable(e);
  });
});

describe('Creation operator zip()', () => {
  it('should match each element from one flow to the corresponding element in the other flow', () => {
    const x = cold('-x-y-z-|');
    const y = cold('--a-b|  ');
    const o = zip(x, y).pipe(map(([x, y]) => `${x}${y}`));
    const e = cold('--A-B|', {A: 'xa', B: 'yb'});
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions('^----!'); // x is unsubscribed early
    expect(y).toHaveSubscriptions('^----!');
  });

  it('should not terminate until all possible matches are emitted even though one stream is terminated', () => {
    const x = cold('----------x-y-z-|');
    const y = cold('--abcdef|        ');
    const o = zip(x, y).pipe(map(([x, y]) => `${x}${y}`));
    const e = cold('----------A-B-C-|', {A: 'xa', B: 'yb', C: 'zc'});
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions('^---------------!');
    expect(y).toHaveSubscriptions('^-------!        ');
  });
});

describe('Creation operator forkJoin()', () => {
  it('should wait till all done', () => {
    const x = cold('-a-b-c--|   ');
    const y = cold('--d-e-|     ');
    const z = cold('-f---g-|    ');
    const o = forkJoin([x, y, z]);
    const e = cold('--------(A|)', {A: ['c', 'e', 'g']});
    expect(o).toBeObservable(e);
    // Note: x, y, z must be finite for o to emit.
    expect(x).toHaveSubscriptions('^-------!');
    expect(y).toHaveSubscriptions('^-----!');
    expect(z).toHaveSubscriptions('^------!');
  });

  it('should emit nothing if one does not emit nothing', () => {
    const x = cold('-a-b-c--|');
    const y = cold('---|     ');
    const z = cold('-f---g-| ');
    const o = forkJoin([x, y, z]);
    const e = cold('---|     ');
    expect(o).toBeObservable(e);
  });

  it('should throw error if one throws error', () => {
    const x = cold('-a-b-c--|');
    const y = cold('--d-e#   ');
    const z = cold('-f---g-| ');
    const o = forkJoin([x, y, z]);
    const e = cold('-----#   ');
    expect(o).toBeObservable(e);
  });
});

describe('Creation operator race()', () => {
  it('should select flow that emits first', () => {
    const x = cold('--a-b-c--|');
    const y = cold('--d-e#    ');
    const z = cold('-f---g-|  ');
    const o = race([x, y, z]);
    const e = cold('-f---g-|  ');
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions('^!'); // x is unsubscribed early
    expect(y).toHaveSubscriptions('^!'); // y is unsubscribed early
    expect(z).toHaveSubscriptions('^------!');
  });

  it('should select flow with first event if that event is error', () => {
    const x = cold('--a-b-c--|');
    const y = cold('--d-e#    ');
    const z = cold('-#  ');
    const o = race(x, y, z);
    const e = cold('-#  ');
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions('^!'); // x is unsubscribed early
    expect(y).toHaveSubscriptions('^!'); // y is unsubscribed early
    expect(z).toHaveSubscriptions('^!');
  });

  it('should select flow with first event even if that event is complete', () => {
    const x = cold('--a-b-c--|');
    const y = cold('--d-e#    ');
    const z = cold('-|  ');
    const o = race(x, y, z);
    const e = cold('-|  ');
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions('^!'); // x is unsubscribed early
    expect(y).toHaveSubscriptions('^!'); // y is unsubscribed early
    expect(z).toHaveSubscriptions('^!');
  });
});

describe('Creation operator defer()', () => {
  it('should only run when subscribed', () => {
    const x = cold('x-y|');
    const o = defer(() => x);
    advanceTime('--|');
    expect(o).toBeObservable(cold('--x-y|'));
    expect(x).toHaveSubscriptions('--^--!');
  });

  it('should be able to simulate iff() operator', () => {
    let selector: 'x' | 'y' = 'x';
    const x = cold('a-b|');
    const y = cold('   c-d|');
    const o = defer(() => ({x, y}[selector]));
    selector = 'x';
    expect(o).toBeObservable(cold('a-b|'));  // equals to x
    expect(x).toHaveSubscriptions('^--!');
    selector = 'y';
    expect(o).toBeObservable(cold('---c-d|'));  // equals to y
    expect(y).toHaveSubscriptions('---^--!');
  });
});

describe('Creation operator iff()', () => {
  /** @see defer : iff functionality can be achieved with defer. */
  it('should select flow based on condition at subscription time', () => {
    let selector: 'x' | 'y' = 'x';
    const x = cold('a-b|');
    const y = cold('c-d|');
    const o = iif(() => selector === 'x', x, y);
    selector = 'x';
    expect(o).toBeObservable(cold('a-b|'));  // equals to x
    expect(x).toHaveSubscriptions('^--!');
    selector = 'y';
    expect(o).toBeObservable(cold('---c-d|'));  // equals to y
    expect(y).toHaveSubscriptions('---^--!');
  });
});

describe('Creation operator timer()', () => {
  it('should create hot flow with delay', () => {
    const delay = time('----|');
    const o = timer(delay, getTestScheduler()).pipe(map(v => `${v}`));
    const e = hot('----(0|)');
    expect(o).toBeObservable(e);
  });

  it('should create hot flow with delay and repeated emissions', () => {
    const delay = time('----------|'); // 100ms since 10ms per frame
    const period = time('---|'); // 30ms
    const o = timer(delay, period, getTestScheduler())
        .pipe(take(6), map(v => `${v}`));
    const e = hot('----------0--1--2--3--4--(5|)');
    expect(o).toBeObservable(e);
  });
});
