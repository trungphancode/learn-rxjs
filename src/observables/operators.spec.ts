/**
 * Demonstrates how rxjs operators are used.
 * @see https://rxmarbles.com
 * @see https://github.com/ReactiveX/rxjs/tree/master/spec/operators
 */
import {cold, getTestScheduler, time} from 'jasmine-marbles';
import {concat, merge, of, pipe, throwError} from 'rxjs';
import {
  catchError,
  combineAll,
  concatAll,
  concatMap,
  defaultIfEmpty,
  delay,
  exhaust,
  exhaustMap,
  filter,
  finalize,
  map,
  mergeAll,
  mergeMap,
  reduce,
  repeat,
  retry,
  share,
  startWith,
  switchAll,
  switchMap,
  takeUntil,
  tap,
  throttleTime,
  zipAll
} from 'rxjs/operators';


describe('Operator map()', () => {
  it('should provide index for the mapper', () => {
    const o = cold('x-y-z|');
    const e = cold('a-b-c|', {a: '0:x', b: '1:y', c: '2:z'});
    const operators = map((v, i) => `${i}:${v}`);
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('Operator filter()', () => {
  it('should accept advanced Type Predicate', () => {
    const o = cold('x-y-z|');
    const e = cold('--y--|');
    const operators = filter((v): v is 'y' => v === 'y');
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('Operator takeUntil()', () => {
  it('should stop when the notifier flow emits', () => {
    const o = cold('x-y-z|');
    const n = cold('---s-|');  // notifier emits
    const e = cold('x-y|  ');
    const operators = takeUntil(n);
    expect(o.pipe(operators)).toBeObservable(e);
    expect(o).toHaveSubscriptions('^--!'); // o is unsubscribed early
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
    expect(o).toHaveSubscriptions('^!'); // o is unsubscribed early
  });

  it('should not throw error if the notifier flow emits at least one before throwing error', () => {
    const o = cold('x-y-z|');
    const n = cold('-s-#    ');  // notifier emits then throws error
    const e = cold('x|');
    const operators = takeUntil(n);
    expect(o.pipe(operators)).toBeObservable(e);
    expect(o).toHaveSubscriptions('^!'); // o is unsubscribed early
  });
});

describe('Operator throttleTime()', () => {
  it('should not change original flow for duration=0', () => {
    const o = cold('-x-y-z|');
    const e = cold('-x-y-z|');
    const operators = throttleTime(0, getTestScheduler());
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('should throttle emissions for duration > 0', () => {
    const o = cold('-x-y-z|');
    const e = cold('-x---z|');
    const operators = throttleTime(time('---|'), getTestScheduler());
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('Operator delay()', () => {
  it('should delay all emissions', () => {
    const o = cold('-x--y--z|');
    const e = cold('--x--y--z|');
    const operators = delay(time('-|'), getTestScheduler());
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('Operator mergeMap()', () => {
  it('should support array', () => {
    const o = cold('x----y----z---|');
    const e = cold('(xx)-(yy)-(zz)|');
    const operators = mergeMap(v => [v, v]);
    expect(o.pipe(operators)).toBeObservable(e);
  });

  /** @see mergeAll */
  it('should merge higher-order observables', () => {
    const o = cold('x-y----z|     ');
    const x = cold('-a---b|       ');
    const y = cold('  -c---d|     ');
    const z = cold('       -e---f|');
    const e = cold('-a-c-b-de---f|');
    const operators = mergeMap((v: 'x' | 'y' | 'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions('^-----!       ');
    expect(y).toHaveSubscriptions('--^-----!     ');
    expect(z).toHaveSubscriptions('-------^-----!');
  });
});

describe('Operator concatMap()', () => {
  it('should support array', () => {
    const o = cold('x----y----z---|');
    const e = cold('(xx)-(yy)-(zz)|');
    const operators = concatMap((v) => [v, v]);
    expect(o.pipe(operators)).toBeObservable(e);
  });

  /** @see concatAll */
  it('should concat higher-order observables', () => {
    const o = cold('--x-y----z|          ');
    const x = cold('  -a---b|            ');
    const y = cold('        -c---d|      ');  // subscribe after x done
    const z = cold('              -e---f|');  // subscribe after y done
    const e = cold('---a---b-c---d-e---f|');
    const operators = concatMap((v: 'x' | 'y' | 'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions('--^-----!');
    expect(y).toHaveSubscriptions('--------^-----!');
    expect(z).toHaveSubscriptions('--------------^-----!');
  });
});

describe('Operator switchMap()', () => {
  /** @see switchAll */
  it('should switch to high-order observable and unsubscribe the previous one', () => {
    const o = cold('--x-y----z|     ');
    const x = cold('  -a---b|       ');
    const y = cold('    -c---d|     ');
    const z = cold('         -e---f|');
    const e = cold('---a-c----e---f|');
    const operators = switchMap((v: 'x' | 'y' | 'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions('--^-!'); // x is unsubscribed earlier
    expect(y).toHaveSubscriptions('----^----!'); // y is unsubscribed earlier
    expect(z).toHaveSubscriptions('---------^-----!');
  });
});

describe('Operator exhaustMap()', () => {
  /** @see exhaust */
  it('should continue with higher-order observable only if previous one is completed', () => {
    const o = cold('--x-y----z|     ');
    const x = cold('  -a---b|       ');
    const y = cold('    -c---d|     ');
    const z = cold('         -e---f|');
    const e = cold('---a---b--e---f|');
    const operators = exhaustMap((v: 'x' | 'y' | 'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions('--^-----!       ');
    expect(y).toHaveSubscriptions([]); // y is ignored, not subscribed
    expect(z).toHaveSubscriptions('---------^-----!');
  });
});

describe('Operator Simple operators', () => {
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

describe('Operator repeat()', () => {
  it('should concat itself multiple times', () => {
    const o = cold('-x-y-|');
    const e = cold('-x-y--x-y--x-y-|');
    const operators = repeat(3);
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('Operator concatAll()', () => {
  it('should concat each observable from a flow of observables', () => {
    const x = cold('  -a---b|            ');  // subscribe after x emit
    const y = cold('        -c---d|      ');  // subscribe after x done
    const z = cold('              -e---f|');  // subscribe after y done
    const o = cold('--x-y----z|          ', {x, y, z});
    const e = cold('---a---b-c---d-e---f|');
    const operators = concatAll();  // equivalent to concatMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions('--^-----!');
    expect(y).toHaveSubscriptions('--------^-----!');
    expect(z).toHaveSubscriptions('--------------^-----!');
  });
});

describe('Operator mergeAll()', () => {
  it('should merge each observable from a flow of observables', () => {
    const x = cold('  -a---b|       ');  // subscribe after x emit
    const y = cold('    -c---d|     ');  // subscribe after y emit
    const z = cold('         -e---f|');  // subscribe after z emit
    const o = cold('--x-y----z|     ', {x, y, z});
    const e = cold('---a-c-b-de---f|');
    const operators = mergeAll();  // equivalent to concatMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions('--^-----!');
    expect(y).toHaveSubscriptions('----^-----!');
    expect(z).toHaveSubscriptions('---------^-----!');
  });
});

describe('Operator switchAll()', () => {
  /** @see switchMap */
  it('should switch each observable from a flow of observables', () => {
    const x = cold('  -a---b|       ');
    const y = cold('    -c---d|     ');
    const z = cold('         -e---f|');
    const o = cold('--x-y----z|     ', {x, y, z});
    const e = cold('---a-c----e---f|');
    const operators = switchAll();  // equivalent to concatMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions('--^-!'); // x is unsubscribed early
    expect(y).toHaveSubscriptions('----^----!'); // y is unsubscribed early
    expect(z).toHaveSubscriptions('---------^-----!');
  });
});

describe('Operator exhaust()', () => {
  it('should apply exhaustMap to each observable from a flow of observables', () => {
    const x = cold('  -a---b|       ');
    const y = cold('    -c--d-|     ');  // totally ignored
    const z = cold('         -e---f|');
    const o = cold('--x-y----z|     ', {x, y, z});
    const e = cold('---a---b--e---f|');
    const operators = exhaust();  // equivalent to exhaustMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions('--^-----!');
    expect(y).toHaveSubscriptions([]); // y is ignored, not subscribed
    expect(z).toHaveSubscriptions('---------^-----!');
  });
});

describe('Operator zipAll()', () => {
  it('should zip elements from observable from a flow of observables', () => {
    const x = cold('        -m-n--|     ');  // subscribe after o done
    const y = cold('        --a----b--c|');  // subscribe after o done
    const o = cold('---xy---|           ', {x, y});
    const e = cold('----------A----(B|) ', {A: 'ma', B: 'nb'});
    const operators = zipAll((m, a) => `${m}${a}`);
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('Operator combineAll()', () => {
  it('combineAll: observable of observables', () => {
    const x = cold('       -m-n--|    ');  // subscribe after o done
    const y = cold('       --a--b--c-|');  // subscribe after o done
    const o = cold('--xy---|          ', {x, y});
    const e = cold('---------AB-C--D-|', {A: 'ma', B: 'na', C: 'nb', D: 'nc'});
    const operators = combineAll((m, a) => `${m}${a}`);
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('Operator startWith()', () => {
  it('should emit its value at the beginning', () => {
    const o = cold('x-----y-|');
    const e = cold('(ax)--y-|');
    const operators = startWith('a');
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('Operator defaultIfEmpty()', () => {
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

describe('Operator retry()', () => {
  it('should retry only if error encountered', () => {
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

describe('Operator share() pipe', () => {
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
