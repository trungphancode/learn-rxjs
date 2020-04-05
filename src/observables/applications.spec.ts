/**
 * Demonstrates how observables are created.
 * @see https://rxmarbles.com
 * @see https://github.com/ReactiveX/rxjs/tree/master/spec/observables
 */
import {cold, initTestScheduler} from 'jasmine-marbles';
import {combineLatest, defer, EMPTY, from, of} from 'rxjs';
import {concatMap, filter, map, switchMap, takeUntil} from 'rxjs/operators';


describe('Application', () => {
  it('should turn from(Promise) to cold observable with defer()', () => {
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

  it('should leverage combineLatest() as a means to gate', async () => {
    const x = cold('-x-y-z-|');
    const y = cold('----a|'); // y acts as a gate (e.g. wait for something to be initialized)
    const o = x.pipe(
        // wait for y
        stream => combineLatest([stream, y]),
        // only keep x
        map(([x]) => x),
    );
    const e = cold('----yz-|');
    expect(o).toBeObservable(e);
    // This idea is the base for waitUtil() operator
  });

  it('should use filter() to avoid bad concatMap if-empty pattern', () => {
    {
      const o = cold('-x-y-z-|');
      const e = cold('-X---Z-|');
      const good = o.pipe(
          filter(v => v !== 'y'),
          map(v => v.toUpperCase()),
      );
      expect(good).toBeObservable(e);
    }
    initTestScheduler();
    {
      const o = cold('-x-y-z-|');
      const e = cold('-X---Z-|');
      const bad = o.pipe(
          concatMap(v => {
            if (v === 'y') {
              return EMPTY;
            }
            return of(v.toUpperCase());
          }),
      );
      expect(bad).toBeObservable(e);
    }
  });

  /** In general, just place takeUntil() at the end to avoid leaks. */
  it('should put takeUtil() after combineLatest to avoid leaks', () => {
    {
      const x = cold('x-----y|        ');
      const y = cold('---a---b---c---|');
      const n = cold('----s|          '); // notifier signals STOP
      const e = cold('---A|           ', {A: ['x', 'a']});
      const xSubs = ('^---!           ');
      const ySubs = ('^---!           '); // y is stopped expectedly
      const rightFlow = x.pipe(
          stream => combineLatest([stream, y]),
          takeUntil(n),
      );
      expect(rightFlow).toBeObservable(e);
      expect(x).toHaveSubscriptions(xSubs);
      expect(y).toHaveSubscriptions(ySubs); // y is stopped expectedly
    }
    initTestScheduler();
    {
      const x = cold('x-----y|        ');
      const y = cold('---a---b---c---|');
      const n = cold('----s|          '); // notifier signals STOP
      const xSubs = ('^---!           ');
      const ySubs = ('^--------------!'); // y not stopped -> leak
      const wrongFlow = x.pipe(
          takeUntil(n), // takeUntil is before the combineLatest
          stream => combineLatest([stream, y]),
      );
      // The wrongFlow is not stopped by takeUtil()
      const e = cold('---A---B---C---|', {
        A: ['x', 'a'],
        B: ['x', 'b'],
        C: ['x', 'c'],
      });
      expect(wrongFlow).toBeObservable(e);
      expect(x).toHaveSubscriptions(xSubs);
      expect(y).toHaveSubscriptions(ySubs);
    }
    initTestScheduler();
    // The wrongFlow is not stopped by takeUntil() because the above code is
    // equivalent to:
    {
      const flow = combineLatest([
        cold('x----|'),
        cold('---a---b---c---|'),
      ]);
      expect(flow).toBeObservable(cold('---A---B---C---|', {
        A: ['x', 'a'],
        B: ['x', 'b'],
        C: ['x', 'c'],
      }));
    }
  });

  /** In general, just place takeUntil() at the end to avoid leaks. */
  it('should put takeUtil() after high-order operators to avoid leaks', () => {
    {
      const x = cold('-a-----b|');
      const y = cold('c---d|   ');
      const o = cold('x--y|    ');
      const n = cold('--n|     '); // notifier signals STOP before y is emitted
      const e = cold('-a|      ');
      const xSubs = ('^-!      '); // x is stopped expectedly
      const ySubs = [] as string[];
      const rightFlow = o.pipe(
          switchMap((v: 'x' | 'y') => ({x, y}[v])),
          takeUntil(n),
      );
      expect(rightFlow).toBeObservable(e);
      expect(x).toHaveSubscriptions(xSubs);
      expect(y).toHaveSubscriptions(ySubs);
    }
    initTestScheduler();
    {
      const x = cold('-a-----b|');
      const y = cold('c---d|   ');
      const o = cold('x--y|    ');
      const n = cold('--n|     '); // notifier signals STOP before y is emitted
      const e = cold('-a-----b|'); // wrong expected result
      const xSubs = ('^-------!'); // x not stopped -> leak
      const ySubs = [] as string[];
      const wrongFlow = o.pipe(
          takeUntil(n), // takeUntil is before switchMap
          switchMap((v: 'x' | 'y') => ({x, y}[v])),
      );
      expect(wrongFlow).toBeObservable(e);
      expect(x).toHaveSubscriptions(xSubs);
      expect(y).toHaveSubscriptions(ySubs);
    }
  });
});
