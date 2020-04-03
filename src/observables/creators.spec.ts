/**
 * Demonstrates how observables are created.
 * @see https://rxmarbles.com
 * @see https://github.com/ReactiveX/rxjs/tree/master/spec/observables
 */
import {cold, getTestScheduler} from 'jasmine-marbles';
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
  zip
} from 'rxjs';
import {map} from 'rxjs/operators';


describe('of()', () => {
  it('should emit all values at once', () => {
    const o = of('x', 'y', 'z');
    const e = cold('(xyz|)');
    expect(o).toBeObservable(e);
    // OR (but not recommended)
    getTestScheduler().expectObservable(o).toBe('(xyz|)');
  });
});

describe('merge()', () => {
  it('should emit both observables in parallel', () => {
    const x = cold('-x-y-z-|');
    const y = cold('a-b|    ');
    const o = merge(x, y);
    const e = cold('axby-z-|');
    expect(o).toBeObservable(e);
  });
});

describe('concat()', () => {
  it('should finish one flow before starting the other', () => {
    const x = cold('-a-b-|    ');  // must be finite for y to subscribe
    const y = cold('     -c-d|');
    const o = concat(x, y);
    const e = cold('-a-b--c-d|');
    expect(o).toBeObservable(e);
  });
});

describe('onErrorResumeNext()', () => {
  it('should continue with next flow without error', () => {
    const x = cold('-a-b-#    ');  // must be finite for y to subscribe
    const y = cold('     -c-d#');
    const o = onErrorResumeNext(x, y);
    const e = cold('-a-b--c-d|');
    expect(o).toBeObservable(e);
  });
});

describe('combineLatest()', () => {
  it('should wait until each flow emits at least once and finish when all flows finish', () => {
    const x = cold('-x-y-z-|');
    const y = cold('--a-b|    ');
    const o = combineLatest([x, y]).pipe(map(([x, y]) => `${x}${y}`));
    const e = cold('--ABCD-|', {A: 'xa', B: 'ya', C: 'yb', D: 'zb'});
    expect(o).toBeObservable(e);
  });

  it('should be able to use like operator', () => {
    const x = cold('-x-y-z-|');
    const y = cold('--a-b|    ');
    const o = x.pipe(
        s => combineLatest([s, y]),
        map(([x, y]) => `${x}${y}`),
    );
    const e = cold('--ABCD-|', {A: 'xa', B: 'ya', C: 'yb', D: 'zb'});
    expect(o).toBeObservable(e);
  });
});

describe('zip()', () => {
  it('should match each element from one flow to the corresponding element in the other flow', () => {
    const x = cold('-x-y-z-|');
    const y = cold('--a-b|  ');
    const o = zip(x, y).pipe(map(([x, y]) => `${x}${y}`));
    const e = cold('--A-B|', {A: 'xa', B: 'yb'});
    expect(o).toBeObservable(e);
  });

  it('should not terminate until all possible matches are emitted even though one stream is terminated', () => {
    const x = cold('----------x-y-z-|');
    const y = cold('--abcdef|        ');
    const o = zip(x, y).pipe(map(([x, y]) => `${x}${y}`));
    const e = cold('----------A-B-C-|', {A: 'xa', B: 'yb', C: 'zc'});
    expect(o).toBeObservable(e);
  });
});

describe('forkJoin()', () => {
  it('should wait till all done', () => {
    const x = cold('-a-b-c--|   ');
    const y = cold('--d-e-|     ');
    const z = cold('-f---g-|    ');
    const o = forkJoin([x, y, z]);
    const e = cold('--------(A|)', {A: ['c', 'e', 'g']});
    expect(o).toBeObservable(e);
    // Note: x, y, z must be finite for o to emit.
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

describe('race()', () => {
  it('should select flow that emits first', () => {
    const x = cold('--a-b-c--|');
    const y = cold('--d-e#    ');
    const z = cold('-f---g-|  ');
    const o = race([x, y, z]);
    const e = cold('-f---g-|  ');
    expect(o).toBeObservable(e);
  });

  it('should select flow with first event if that event is error', () => {
    const x = cold('--a-b-c--|');
    const y = cold('--d-e#    ');
    const z = cold('-#  ');
    const o = race(x, y, z);
    const e = cold('-#  ');
    expect(o).toBeObservable(e);
  });

  it('should select flow with first event even if that event is complete', () => {
    const x = cold('--a-b-c--|');
    const y = cold('--d-e#    ');
    const z = cold('-|  ');
    const o = race(x, y, z);
    const e = cold('-|  ');
    expect(o).toBeObservable(e);
  });
});

describe('defer()', () => {
  it('should only run with subscribed', () => {
    let selector: 'x' | 'y' | 'z' = 'x';
    const x = cold('a-b|');
    const y = cold('   c-d|');
    const z = cold('      e-f|');
    const o = defer(() => ({x, y, z}[selector]));
    selector = 'x';
    expect(o).toBeObservable(cold('a-b|'));  // equals to x
    selector = 'y';
    expect(o).toBeObservable(cold('---c-d|'));  // equals to y
    selector = 'z';
    expect(o).toBeObservable(cold('------e-f|'));  // equals to z
  });
});

describe('iff()', () => {
  /** @see defer : iff functionality can be achieved with defer. */
  it('should select flow based on condition at subscription time', () => {
    let selector: 'x' | 'y' = 'x';
    const x = cold('a-b|');
    const y = cold('c-d|');
    const o = iif(() => selector === 'x', x, y);
    selector = 'x';
    expect(o).toBeObservable(cold('a-b|'));  // equals to x
    selector = 'y';
    expect(o).toBeObservable(cold('---c-d|'));  // equals to y
  });
});
