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
  from,
  iif,
  merge,
  of,
  onErrorResumeNext,
  race,
  zip
} from 'rxjs';
import {map} from 'rxjs/operators';


describe('Creators Application:', async () => {
  it('defer Promise', async () => {
    let nextId = 1;
    // do not use from(...) directly, but defer(() => from(...)) to create
    // a cold observable (i.e. only gen Promise when subscribing)
    const o = defer(() => from(Promise.resolve(nextId++)));
    o.subscribe((e) => {
      expect(e).toBe(1);
    });
    o.subscribe((e) => {
      expect(e).toBe(2);
    });
  });

  it('combineLatest: as a means to gate', async () => {
    const x = cold('-x-y-z-|');
    const y = cold('----a|    ');
    const o = x.pipe(
        // wait for y
        stream => combineLatest(stream, y),
        // only keep x
        map(([x]: ReadonlyArray<string>) => x),
    );
    // const o = combineLatest(x, y).pipe(map(([x, y]) => `${x}${y}`));
    const e = cold('----yz-|');
    expect(o).toBeObservable(e);
  });
});
