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


describe('Creators', async () => {
  it('of: use Test Scheduler', async () => {
    // TestScheduler is no longer needed
    const o = of('x', 'y', 'z');
    const e = cold('(xyz|)');
    expect(o).toBeObservable(e);
  });

  it('of: turn into observable with Test Scheduler', async () => {
    // TestScheduler is no longer needed
    const o = of('x', 'y', 'z');
    const e = cold('(xyz|)');
    expect(o.pipe(map((v) => v))).toBeObservable(e);
    // OR
    getTestScheduler().expectObservable(o).toBe('(xyz|)');
  });

  it('merge', async () => {
    const x = cold('-x-y-z-|');
    const y = cold('a-b|    ');
    const o = merge(x, y);
    const e = cold('axby-z-|');
    expect(o).toBeObservable(e);
  });

  it('concat', async () => {
    const x = cold('-a-b-|    ');  // must be finite for y to subscribe
    const y = cold('     -c-d|');
    const o = concat(x, y);
    const e = cold('-a-b--c-d|');
    expect(o).toBeObservable(e);
  });

  it('onErrorResumeNext', async () => {
    const x = cold('-a-b-#    ');  // must be finite for y to subscribe
    const y = cold('     -c-d#');
    const o = onErrorResumeNext(x, y);
    const e = cold('-a-b--c-d|');
    expect(o).toBeObservable(e);
  });

  it('combineLatest', async () => {
    const x = cold('-x-y-z-|');
    const y = cold('--a-b|    ');
    const o = combineLatest(x, y).pipe(map(([x, y]) => `${x}${y}`));
    const e = cold('--ABCD-|', {A: 'xa', B: 'ya', C: 'yb', D: 'zb'});
    expect(o).toBeObservable(e);
  });

  it('zip', async () => {
    const x = cold('-x-y-z-|');
    const y = cold('--a-b|    ');
    const o = zip(x, y).pipe(map(([x, y]) => `${x}${y}`));
    const e = cold('--A-B|', {A: 'xa', B: 'yb'});
    expect(o).toBeObservable(e);
  });

  it('forkJoin: wait till all done', async () => {
    const x = cold('-a-b-c--|   ');
    const y = cold('--d-e-|     ');
    const z = cold('-f---g-|    ');
    const o = forkJoin(x, y, z);  // same as forkJoin([x, y, z])
    const e = cold('--------(A|)', {A: ['c', 'e', 'g']});
    expect(o).toBeObservable(e);
    // Note: x, y, z must be finite for o to emit.
  });

  it('forkJoin: one not emit', async () => {
    const x = cold('-a-b-c--|');
    const y = cold('---|     ');
    const z = cold('-f---g-| ');
    const o = forkJoin(x, y, z);
    const e = cold('---|     ');
    expect(o).toBeObservable(e);
  });

  it('forkJoin: one throws error', async () => {
    const x = cold('-a-b-c--|');
    const y = cold('--d-e#   ');
    const z = cold('-f---g-| ');
    const o = forkJoin(x, y, z);
    const e = cold('-----#   ');
    expect(o).toBeObservable(e);
  });

  it('race: who emit first', async () => {
    const x = cold('--a-b-c--|');
    const y = cold('--d-e#    ');
    const z = cold('-f---g-|  ');
    const o = race(x, y, z);
    const e = cold('-f---g-|  ');
    expect(o).toBeObservable(e);
  });

  it('race: first error (w/o emit)', async () => {
    const x = cold('--a-b-c--|');
    const y = cold('--d-e#    ');
    const z = cold('-#  ');
    const o = race(x, y, z);
    const e = cold('-#  ');
    expect(o).toBeObservable(e);
  });

  it('race: first complete (w/o emit)', async () => {
    const x = cold('--a-b-c--|');
    const y = cold('--d-e#    ');
    const z = cold('-|  ');
    const o = race(x, y, z);
    const e = cold('-|  ');
    expect(o).toBeObservable(e);
  });

  it('defer', async () => {
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

  /** @see defer : iff functionality can be achieved with defer. */
  it('iff', async () => {
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
