/**
 * Demonstrates how rxjs operators are used.
 * @see https://rxmarbles.com
 * @see https://github.com/ReactiveX/rxjs/tree/master/spec/operators
 */
import {cold} from 'jasmine-marbles';
import {pipe, throwError} from 'rxjs';
import {catchError, combineAll, concatAll, concatMap, exhaust, exhaustMap, filter, finalize, map, mergeAll, mergeMap, repeat, switchAll, switchMap, takeUntil, tap, zipAll} from 'rxjs/operators';


describe('Operators', async () => {
  it('map with index', async () => {
    const o = cold('x-y-z|');
    const e = cold('a-b-c|', {a: '0:x', b: '1:y', c: '2:z'});
    const operators = map((v, i) => `${i}:${v}`);
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('filter with type predicate', async () => {
    const o = cold('x-y-z|');
    const e = cold('--y--|');
    const operators = filter((v): v is 'y' => v === 'y');
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('takeUntil with emit', async () => {
    const o = cold('x-y-z|');
    const n = cold('---s-|');  // notifier emits
    const e = cold('x-y|  ');
    const operators = takeUntil(n);
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('takeUntil without emit', async () => {
    const o = cold('x-y-z|');
    const n = cold('-|    ');  // notifier does not emit
    const e = cold('x-y-z|');
    const operators = takeUntil(n);
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('mergeMap with array: one becomes many', async () => {
    const o = cold('x----y----z---|');
    const e = cold('(xx)-(yy)-(zz)|');
    const operators = mergeMap((v) => [v, v]);
    expect(o.pipe(operators)).toBeObservable(e);
  });

  /** @see mergeAll */
  it('mergeMap with observable', async () => {
    const o = cold('x-y----z|     ');
    const x = cold('-a---b|       ');
    const y = cold('  -c---d|     ');
    const z = cold('       -e---f|');
    const e = cold('-a-c-b-de---f|');
    const operators = mergeMap((v: 'x'|'y'|'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('concatMap with array: one becomes many', async () => {
    const o = cold('x----y----z---|');
    const e = cold('(xx)-(yy)-(zz)|');
    const operators = concatMap((v) => [v, v]);
    expect(o.pipe(operators)).toBeObservable(e);
  });

  /** @see concatAll */
  it('concatMap with observable', async () => {
    const o = cold('--x-y----z|          ');
    const x = cold('  -a---b|            ');
    const y = cold('        -c---d|      ');  // subscribe after x done
    const z = cold('              -e---f|');  // subscribe after y done
    const e = cold('---a---b-c---d-e---f|');
    const operators = concatMap((v: 'x'|'y'|'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
  });

  /** @see switchAll */
  it('switchMap with observable', async () => {
    const o = cold('--x-y----z|     ');
    const x = cold('  -a---b|       ');
    const y = cold('    -c---d|     ');
    const z = cold('         -e---f|');
    const e = cold('---a-c----e---f|');
    const operators = switchMap((v: 'x'|'y'|'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
  });

  /** @see exhaust */
  it('exhaustMap with observable', async () => {
    const o = cold('--x-y----z|     ');
    const x = cold('  -a---b|       ');
    const y = cold('    -c---d|     ');
    const z = cold('         -e---f|');
    const e = cold('---a---b--e---f|');
    const operators = exhaustMap((v: 'x'|'y'|'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('Simple operators', async () => {
  it('tap - catchError - finalize: no error', async () => {
    const o = cold('-x-y-|');
    const e = cold('-x-y-|');
    const operators = pipe(
        tap((_) => 'a'),  // ignore return value
        catchError((err) => throwError(err)),
        finalize(() => 'b'),  // ignore return value
    );
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('tap - catchError - finalize: error', async () => {
    const o = cold('-x-y-#');
    const e = cold('-x-y-#');
    const operators = pipe(
        tap((_) => 'a'),
        catchError((err) => throwError(err)),
        finalize(() => 'b'),
    );
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('repeat', async () => {
    const o = cold('-x-y-|');
    const e = cold('-x-y--x-y--x-y-|');
    const operators = repeat(3);
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('High order operators', async () => {
  it('concatAll: observable of observables', async () => {
    const x = cold('  -a---b|            ');  // subscribe after x emit
    const y = cold('        -c---d|      ');  // subscribe after x done
    const z = cold('              -e---f|');  // subscribe after y done
    const o = cold('--x-y----z|          ', {x, y, z});
    const e = cold('---a---b-c---d-e---f|');
    const operators = concatAll();  // equivalent to concatMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('mergeAll: observable of observables', async () => {
    const x = cold('  -a---b|       ');  // subscribe after x emit
    const y = cold('    -c---d|     ');  // subscribe after y emit
    const z = cold('         -e---f|');  // subscribe after z emit
    const o = cold('--x-y----z|     ', {x, y, z});
    const e = cold('---a-c-b-de---f|');
    const operators = mergeAll();  // equivalent to concatMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
  });

  /** @see switchMap */
  it('switchAll: observable of observables', async () => {
    const x = cold('  -a---b|       ');
    const y = cold('    -c---d|     ');
    const z = cold('         -e---f|');
    const o = cold('--x-y----z|     ', {x, y, z});
    const e = cold('---a-c----e---f|');
    const operators = switchAll();  // equivalent to concatMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('exhaust: observable of observables', async () => {
    const x = cold('  -a---b|       ');
    const y = cold('    -c--d-|     ');  // totally ignored
    const z = cold('         -e---f|');
    const o = cold('--x-y----z|     ', {x, y, z});
    const e = cold('---a---b--e---f|');
    const operators = exhaust();  // equivalent to exhaustMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('zipAll: observable of observables', async () => {
    const x = cold('        -m-n--|     ');  // subscribe after o done
    const y = cold('        --a----b--c|');  // subscribe after o done
    const o = cold('---xy---|           ', {x, y});
    const e = cold('----------A----(B|) ', {A: 'ma', B: 'nb'});
    const operators = zipAll((m, a) => `${m}${a}`);
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('combineAll: observable of observables', async () => {
    const x = cold('       -m-n--|    ');  // subscribe after o done
    const y = cold('       --a--b--c-|');  // subscribe after o done
    const o = cold('--xy---|          ', {x, y});
    const e = cold('---------AB-C--D-|', {A: 'ma', B: 'na', C: 'nb', D: 'nc'});
    const operators = combineAll((m, a) => `${m}${a}`);
    expect(o.pipe(operators)).toBeObservable(e);
  });
});
