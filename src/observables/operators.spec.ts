/**
 * Demonstrates how rxjs operators are used.
 * @see https://rxmarbles.com
 * @see https://github.com/ReactiveX/rxjs/tree/master/spec/operators
 */
import {cold, getTestScheduler, time} from 'jasmine-marbles';
import {concat, defer, merge, of, pipe, throwError} from 'rxjs';
import {
  catchError,
  combineAll,
  concatAll,
  concatMap,
  defaultIfEmpty,
  delay,
  distinctUntilChanged,
  exhaust,
  exhaustMap,
  filter,
  finalize,
  map,
  mapTo,
  mergeAll,
  mergeMap,
  pairwise,
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
    const oSubs = ('^--!  '); // o is unsubscribed early
    const operators = takeUntil(n);
    expect(o.pipe(operators)).toBeObservable(e);
    expect(o).toHaveSubscriptions(oSubs);
  });

  it('should not stop when the notifier flow complete without emitting', () => {
    const o = cold('x-y-z|');
    const n = cold('-|    ');  // notifier does not emit
    const e = cold('x-y-z|');
    const oSubs = ('^----!');
    const operators = takeUntil(n);
    expect(o.pipe(operators)).toBeObservable(e);
    expect(o).toHaveSubscriptions(oSubs);
  });

  it('should error when the notifier flow throws error without emitting', () => {
    const o = cold('x-y-z|');
    const n = cold('-#    ');  // notifier throws error
    const e = cold('x#    ');
    const oSubs = ('^!    '); // o is unsubscribed early
    const operators = takeUntil(n);
    expect(o.pipe(operators)).toBeObservable(e);
    expect(o).toHaveSubscriptions(oSubs);
  });

  it('should not throw error if the notifier flow emits at least one before throwing error', () => {
    const o = cold('x-y-z|');
    const n = cold('-s-#  ');  // notifier emits then throws error
    const e = cold('x|    ');
    const oSubs = ('^!    '); // o is unsubscribed early
    const operators = takeUntil(n);
    expect(o.pipe(operators)).toBeObservable(e);
    expect(o).toHaveSubscriptions(oSubs);
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
    const t = time(' ---|  ');
    const operators = throttleTime(t, getTestScheduler());
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('Operator delay()', () => {
  it('should delay all emissions', () => {
    const o = cold('-x--y--z| ');
    const e = cold('--x--y--z|');
    const oSubs = ('^-------! ');
    const operators = delay(time('-|'), getTestScheduler());
    expect(o.pipe(operators)).toBeObservable(e);
    expect(o).toHaveSubscriptions(oSubs);
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
    const xSubs = ('^-----!       ');
    const ySubs = ('--^-----!     ');
    const zSubs = ('-------^-----!');
    const operators = mergeMap((v: 'x' | 'y' | 'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
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
    const xSubs = ('--^-----!            ');
    const ySubs = ('--------^-----!      ');
    const zSubs = ('--------------^-----!');
    const operators = concatMap((v: 'x' | 'y' | 'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
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
    const xSubs = ('--^-!           '); // x is unsubscribed earlier
    const ySubs = ('----^----!      '); // y is unsubscribed earlier
    const zSubs = ('---------^-----!');
    const operators = switchMap((v: 'x' | 'y' | 'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
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
    const xSubs = ('--^-----!       ');
    const ySubs = [] as string[]; // y is ignored, not subscribed
    const zSubs = ('---------^-----!');
    const operators = exhaustMap((v: 'x' | 'y' | 'z') => ({x, y, z}[v]));
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
  });
});

describe('Operator tap-catchError-finalize', () => {
  it('should simulate try-catch blocks', () => {
    const o = cold('-x-y-|');
    const e = cold('-x-y-|');
    const operators = pipe(
        tap(_ => 'a'),  // ignore return value
        catchError(err => throwError(err)),
        finalize(() => 'b'),  // ignore return value
    );
    expect(o.pipe(operators)).toBeObservable(e);
  });

  it('should simulate try-catch blocks with error', () => {
    const o = cold('-x-y-#');
    const e = cold('-x-y-#');
    const operators = pipe(
        tap(_ => 'a'),
        catchError(err => throwError(err)),
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
    const x = cold('  -a---b|              ');
    const y = cold('        -c---d|        ');
    const z = cold('                -e---f|');
    const o = cold('--x-y-----------z|     ', {x, y, z});
    const e = cold('---a---b-c---d---e---f|');
    const xSubs = ('--^-----!              '); // subscribe after x emit
    const ySubs = ('--------^-----!        '); // subscribe after x done
    const zSubs = ('----------------^-----!'); // subscribe after y done
    const operators = concatAll();  // equivalent to concatMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
  });
});

describe('Operator mergeAll()', () => {
  it('should merge each observable from a flow of observables', () => {
    const x = cold('  -a---b|       ');  // subscribe after x emit
    const y = cold('    -c---d|     ');  // subscribe after y emit
    const z = cold('         -e---f|');  // subscribe after z emit
    const o = cold('--x-y----z|     ', {x, y, z});
    const e = cold('---a-c-b-de---f|');
    const xSubs = ('--^-----!       ');
    const ySubs = ('----^-----!     ');
    const zSubs = ('---------^-----!');
    const operators = mergeAll();  // equivalent to concatMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
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
    const xSubs = ('--^-!           '); // x is unsubscribed early
    const ySubs = ('----^----!      '); // y is unsubscribed early
    const zSubs = ('---------^-----!');
    const operators = switchAll();  // equivalent to concatMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
  });
});

describe('Operator exhaust()', () => {
  it('should apply exhaustMap to each observable from a flow of observables', () => {
    const x = cold('  -a---b|       ');
    const y = cold('    -c--d-|     ');
    const z = cold('         -e---f|');
    const o = cold('--x-y----z|     ', {x, y, z});
    const e = cold('---a---b--e---f|');
    const xSubs = ('--^-----!       ');
    const ySubs = [] as string[]; // y is ignored, not subscribed
    const zSubs = ('---------^-----!');
    const operators = exhaust();  // equivalent to exhaustMap((v) => v)
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
  });
});

describe('Operator zipAll()', () => {
  it('should zip elements from observable from a flow of observables', () => {
    const x = cold('        -m-n--|     ');
    const y = cold('        --a----b--c|');
    const o = cold('---xy---|           ', {x, y});
    const e = cold('----------A----(B|) ', {A: 'ma', B: 'nb'});
    const xSubs = ('--------^-----!     '); // both (x,y) subscribed after o done
    const ySubs = ('--------^------!    '); // y unsubscribed early since x done
    const operators = zipAll((m, a) => `${m}${a}`);
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
  });
});

describe('Operator combineAll()', () => {
  it('combineAll: observable of observables', () => {
    const x = cold('       -m-n--|    ');
    const y = cold('       --a--b--c-|');
    const o = cold('--xy---|          ', {x, y});
    const e = cold('---------AB-C--D-|', {A: 'ma', B: 'na', C: 'nb', D: 'nc'});
    const xSubs = ('-------^-----!    ');  // x subscribed after o done
    const ySubs = ('-------^---------!');  // y subscribed after o done
    const operators = combineAll((m, a) => `${m}${a}`);
    expect(o.pipe(operators)).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
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

describe('Operator share() and retry()', () => {
  it('should be able to use together', () => {
    // Each emission from flow fA and fB simulates the effort to make RPC for data.
    // But for each RPC, we must make a common check to get a valid token for RPC.
    // The common checks take time and can fail; so, they are shared and retryable.

    const fA = cold('aA--------a|      '); // first a trigger check 1, second A wait for shared check 1, last a wait for shared check 3
    const fB = cold('---------b|       '); // b trigger check 3
    const c1 = cold('--(f|)            '); // check 1: failure => retry with check 2
    const c1Subs = ('^-!               '); // check 1 subscription
    const c2 = cold('  --(s|)          '); // check 2: success
    const c2Subs = ('--^-!             '); // check 2 subscription right after check 1
    const c3 = cold('         --(f|)   '); // check 3: failure => retry with check 4
    const c3Subs = ('---------^-!      '); // check 3 subscription
    const c4 = cold('           --(s|) '); // check 4: success
    const c4Subs = ('-----------^-!    '); // check 4 subscription right after check 3
    const ex = cold('----(aA)-----(ba|)'); // expected final flow
    //           c2 done ^        ^ c4 done

    let numCheck = 0; // number of actual check runs: should be only 4: 2 failure, 2 success
    // actualCheck is a simulation of checking and getting valid token (failure followed by success)
    const actualCheck = defer(() => [c1, c2, c3, c4][numCheck++]);
    // sharedCheck is real code to show that common checks can be shared and retried
    const sharedCheck = actualCheck.pipe(
        share(),
        // If error is thrown after share(), this aggregate is needed to terminate the share() pipe,
        // making this pipe repeatable for retry.
        // Try moving the error throwing before share() and removing this aggregate, test will pass.
        // This aggregate function waits until the actual check is complete and takes the final result.
        reduce((acc, v) => v),
        tap(checkedResult => {
          // This block runs 8 times: 1 failure & 1 success for each emission of fA and fB
          // But actual checks above run 4 times because of shared checks: 2 failure & 2 success
          if (checkedResult === 'f') {
            // Show case throwing Error after share() and before retry()
            throw new Error('Failed check');
          }
        }),
        retry(),
        tap(checkedResult => {
          // This block runs 4 times because 4 failure checks are retried
          expect(checkedResult).toBe('s'); // success
        }),
    );

    const faWithCheck = fA.pipe(mergeMap(v => sharedCheck.pipe(mapTo(v))));
    const fbWithCheck = fB.pipe(mergeMap(v => sharedCheck.pipe(mapTo(v))));
    expect(merge(faWithCheck, fbWithCheck)).toBeObservable(ex);
    expect(numCheck).toBe(4);
    expect(c1).toHaveSubscriptions(c1Subs);
    expect(c2).toHaveSubscriptions(c2Subs);
    expect(c3).toHaveSubscriptions(c3Subs);
    expect(c4).toHaveSubscriptions(c4Subs);
  });
});

describe('Operator pairwise()', () => {
  it('should provide previous values but ignore the first value', () => {
    const o = cold('x---y---z-|');
    const e = cold('----A---B-|', {A: ['x', 'y'], B: ['y', 'z']});
    const operators = pairwise();
    expect(o.pipe(operators)).toBeObservable(e);
  });
});

describe('Operator distinctUntilChanged()', () => {
  it('should provide distinct values', () => {
    const o = cold('xxy-y-x-zz-|');
    const e = cold('x-y---x-z--|');
    const operators = distinctUntilChanged();
    expect(o.pipe(operators)).toBeObservable(e);
  });
});
