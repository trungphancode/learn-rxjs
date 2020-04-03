/**
 * Demonstrates how rxjs operators are used.
 * @see https://rxmarbles.com
 * @see https://github.com/ReactiveX/rxjs/tree/master/spec/operators
 */
import {cold} from 'jasmine-marbles';
import {
  concat,
  defer,
  merge,
  MonoTypeOperatorFunction,
  of,
  pipe,
  Subject,
  throwError,
  timer
} from 'rxjs';
import {
  catchError,
  combineAll,
  concatAll,
  concatMap, defaultIfEmpty,
  exhaust,
  exhaustMap,
  filter,
  finalize,
  groupBy,
  map,
  mergeAll,
  mergeMap, reduce,
  repeat, retry, share,
  startWith,
  switchAll,
  switchMap,
  take,
  takeUntil,
  tap,
  zipAll
} from 'rxjs/operators';


describe('map() operator', () => {
  it('should provide index for the mapper', () => {
    const o = cold('x-y-z|');
    const e = cold('a-b-c|', {a: '0:x', b: '1:y', c: '2:z'});
    const operators = map((v, i) => `${i}:${v}`);
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('filter() operator', () => {
  it('should accept advanced Type Predicate', () => {
    const o = cold('x-y-z|');
    const e = cold('--y--|');
    const operators = filter((v): v is 'y' => v === 'y');
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('takeUntil() operator', () => {
  it('should stop when the notifier flow emits', () => {
    const o = cold('x-y-z|');
    const n = cold('---s-|');  // notifier emits
    const e = cold('x-y|  ');
    const operators = takeUntil(n);
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('should not stop when the notifier flow complete without emitting', () => {
    const o = cold('x-y-z|');
    const n = cold('-|    ');  // notifier does not emit
    const e = cold('x-y-z|');
    const operators = takeUntil(n);
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('should error when the notifier flow throws error without emitting', () => {
    const o = cold('x-y-z|');
    const n = cold('-#    ');  // notifier throws error
    const e = cold('x#');
    const operators = takeUntil(n);
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('should not throw error if the notifier flow emits at least one before throwing error', () => {
    const o = cold('x-y-z|');
    const n = cold('-s-#    ');  // notifier emits then throws error
    const e = cold('x|');
    const operators = takeUntil(n);
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('mergeMap() operator', () => {
  it('mergeMap with array: one becomes many', () => {
    const o = cold('x----y----z---|');
    const e = cold('(xx)-(yy)-(zz)|');
    const operators = mergeMap((v) => [v, v]);
    expect(o.pipe(operators)).toBeObservable(e);
  });

  /** @see mergeAll */
  it('mergeMap with observable', () => {
    const o = cold('x-y----z|     ');
    const x = cold('-a---b|       ');
    const y = cold('  -c---d|     ');
    const z = cold('       -e---f|');
    const e = cold('-a-c-b-de---f|');
    const operators = mergeMap((v: 'x' | 'y' | 'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('concatMap() operator', () => {
  it('concatMap with array: one becomes many', () => {
    const o = cold('x----y----z---|');
    const e = cold('(xx)-(yy)-(zz)|');
    const operators = concatMap((v) => [v, v]);
    expect(o.pipe(operators)).toBeObservable(e);
  });

  /** @see concatAll */
  it('concatMap with observable', () => {
    const o = cold('--x-y----z|          ');
    const x = cold('  -a---b|            ');
    const y = cold('        -c---d|      ');  // subscribe after x done
    const z = cold('              -e---f|');  // subscribe after y done
    const e = cold('---a---b-c---d-e---f|');
    const operators = concatMap((v: 'x' | 'y' | 'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('switchMap() operator', () => {
  /** @see switchAll */
  it('switchMap with observable', () => {
    const o = cold('--x-y----z|     ');
    const x = cold('  -a---b|       ');
    const y = cold('    -c---d|     ');
    const z = cold('         -e---f|');
    const e = cold('---a-c----e---f|');
    const operators = switchMap((v: 'x' | 'y' | 'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('exhaustMap() operator', () => {
  /** @see exhaust */
  it('exhaustMap with observable', () => {
    const o = cold('--x-y----z|     ');
    const x = cold('  -a---b|       ');
    const y = cold('    -c---d|     ');
    const z = cold('         -e---f|');
    const e = cold('---a---b--e---f|');
    const operators = exhaustMap((v: 'x' | 'y' | 'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('Simple operators', () => {
  it('tap - catchError - finalize: no error', () => {
    const o = cold('-x-y-|');
    const e = cold('-x-y-|');
    const operators = pipe(
        tap((_) => 'a'),  // ignore return value
        catchError((err) => throwError(err)),
        finalize(() => 'b'),  // ignore return value
    );
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('tap - catchError - finalize: error', () => {
    const o = cold('-x-y-#');
    const e = cold('-x-y-#');
    const operators = pipe(
        tap((_) => 'a'),
        catchError((err) => throwError(err)),
        finalize(() => 'b'),
    );
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('repeat() operator', () => {
  it('should concat itself multiple times', () => {
    const o = cold('-x-y-|');
    const e = cold('-x-y--x-y--x-y-|');
    const operators = repeat(3);
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('concatAll() operator', () => {
  it('should concat each observable from a flow of observables', () => {
    const x = cold('  -a---b|            ');  // subscribe after x emit
    const y = cold('        -c---d|      ');  // subscribe after x done
    const z = cold('              -e---f|');  // subscribe after y done
    const o = cold('--x-y----z|          ', {x, y, z});
    const e = cold('---a---b-c---d-e---f|');
    const operators = concatAll();  // equivalent to concatMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('mergeAll() operator', () => {
  it('should merge each observable from a flow of observables', () => {
    const x = cold('  -a---b|       ');  // subscribe after x emit
    const y = cold('    -c---d|     ');  // subscribe after y emit
    const z = cold('         -e---f|');  // subscribe after z emit
    const o = cold('--x-y----z|     ', {x, y, z});
    const e = cold('---a-c-b-de---f|');
    const operators = mergeAll();  // equivalent to concatMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('switchAll() operator', () => {
  /** @see switchMap */
  it('should switch each observable from a flow of observables', () => {
    const x = cold('  -a---b|       ');
    const y = cold('    -c---d|     ');
    const z = cold('         -e---f|');
    const o = cold('--x-y----z|     ', {x, y, z});
    const e = cold('---a-c----e---f|');
    const operators = switchAll();  // equivalent to concatMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('exhaust() operator', () => {
  it('should apply exhaustMap to each observable from a flow of observables', () => {
    const x = cold('  -a---b|       ');
    const y = cold('    -c--d-|     ');  // totally ignored
    const z = cold('         -e---f|');
    const o = cold('--x-y----z|     ', {x, y, z});
    const e = cold('---a---b--e---f|');
    const operators = exhaust();  // equivalent to exhaustMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('zipAll() operator', () => {
  it('should zip elements from observable from a flow of observables', () => {
    const x = cold('        -m-n--|     ');  // subscribe after o done
    const y = cold('        --a----b--c|');  // subscribe after o done
    const o = cold('---xy---|           ', {x, y});
    const e = cold('----------A----(B|) ', {A: 'ma', B: 'nb'});
    const operators = zipAll((m, a) => `${m}${a}`);
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('combineAll() operator', () => {
  it('combineAll: observable of observables', () => {
    const x = cold('       -m-n--|    ');  // subscribe after o done
    const y = cold('       --a--b--c-|');  // subscribe after o done
    const o = cold('--xy---|          ', {x, y});
    const e = cold('---------AB-C--D-|', {A: 'ma', B: 'na', C: 'nb', D: 'nc'});
    const operators = combineAll((m, a) => `${m}${a}`);
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('startWith() operator', () => {
  it('should emit its value at the beginning', () => {
    const o = cold('x-----y-|');
    const e = cold('(ax)--y-|');
    const operators = startWith('a');
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('defaultIfEmpty() operator', () => {
  it('should emit default value if the original flow completes without emitting', () => {
    const o = cold('--|');
    const e = cold('--(a|)');
    const operators = defaultIfEmpty('a');
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('should not emit default value if the original flow emits something', () => {
    const o = cold('--x-|');
    const e = cold('--x-|)');
    const operators = defaultIfEmpty('a');
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('retry() operator', () => {
  it('should retry if error encountered', () => {
    const o = cold('(xy|)');
    let d = 0;
    const m = o.pipe(
        mergeMap(a => {
          if (a === 'x' && d++ === 0) {
            return throwError('Something');
          }
          return of(a);
        }),
        retry(),
    );
    const e = cold('(xy|)');
    expect(m).toBeObservable(e);
  });
});

describe('share() pipe', () => {
  it('should be sharable', () => {
    const myShared = of(true).pipe(share());
    const a = concat(myShared, myShared, cold('------x----y---|'));
    const b = concat(myShared, cold('------x----y---|'));
    const e = cold('(aaa)-(xx)-(yy)|', {a: true, x: 'x', y: 'y'});
    expect(merge(a, b)).toBeObservable(e);
  });

  it('should be terminated with reduce() aggregate', () => {
    const myShared = of(true).pipe(
        share(),
        // this aggregate function will help terminate the share pipe, making
        // it repeatable for retry.
        reduce((acc, v) => v),
    );

    const o = myShared
        .pipe(
            // make myShared repeated on purpose to show that reduce() works
            mergeMap(() => myShared),
            map(() => 'a'));
    const e = cold('(a|)');
    expect(o).toBeObservable(e);
  });

  it('should be terminated with filter()', () => {
    const myShared = of(true).pipe(
        share(),
        stream => concat(stream, of('sentinel')),
        filter(v => v === 'sentinel'),
    );

    const o = myShared
        .pipe(
            // make myShared repeated on purpose to show that filter() works
            mergeMap(() => myShared),
            map(() => 'a'));
    const e = cold('(a|)');
    expect(o).toBeObservable(e);
  });
});
