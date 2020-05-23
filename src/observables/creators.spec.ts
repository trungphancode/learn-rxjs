/**
 * Demonstrates how observables are created.
 * @see https://rxmarbles.com
 * @see https://github.com/ReactiveX/rxjs/tree/master/spec/observables
 * @see https://github.com/ReactiveX/rxjs/tree/6.x/spec/observables
 */
import {cold, getTestScheduler, hot, time} from 'jasmine-marbles';
import {
  combineLatest,
  concat,
  defer,
  forkJoin,
  fromEventPattern,
  iif,
  merge,
  Observable,
  of,
  onErrorResumeNext,
  pipe,
  race,
  ReplaySubject,
  Subscription,
  timer,
  zip
} from 'rxjs';
import {filter, map, take, tap} from 'rxjs/operators';
import {
  TestColdObservable,
  TestHotObservable,
} from 'jasmine-marbles/src/test-observables';


describe('new Observable()', () => {
  it('should create a cold Observable when activating producer inside the subscription', () => {
    function createColdObservableFromColdProducer(producer: TestColdObservable): Observable<string> {
      return new Observable<string>(observer => {
        // This block will run when observer subscribes
        const subscription: Subscription = producer.subscribe(
            v => observer.next(v),
            err => observer.error(err),
            () => observer.complete(),
        ); // subscribe to the producer inside this observer's subscription
        return () => {
          // cleanup when observer unsubscribe or producer completes or errors
          subscription.unsubscribe();
        };
      });
    }

    const producer1 = cold('-x-y-z|    ');
    const obsvable1 = createColdObservableFromColdProducer(producer1);
    const obsvable1SubsM = '--^        ';
    const obsvable2 = obsvable1.pipe(take(2));
    const obsvable2SubsM = '----^      ';
    const expected1 = cold('---x-y-z|  ');
    const expected2 = cold('-----x-(y|)');
    const producer1Subs = ['--^-----!  ',  /// subscribed for observer 1
      /*                */ '----^--!   '];  // subscribed for observer 2 and unsubscribed early

    getTestScheduler().expectObservable(obsvable1, obsvable1SubsM).toBe(expected1.marbles, expected1.values);
    getTestScheduler().expectObservable(obsvable2, obsvable2SubsM).toBe(expected2.marbles, expected2.values);
    getTestScheduler().expectSubscriptions(producer1.getSubscriptions()).toBe(producer1Subs);
  });

  it('should create hot Observable when activating producer outside the subscription', () => {
    function createHotObservableFromColdProducer(producer: TestHotObservable): Observable<string> {
      return new Observable<string>(observer => {
        // This block will run when observer subscribes, but the producer is
        // hot (i.e. already activated outside).
        const subscription: Subscription = producer.subscribe(
            v => observer.next(v),
            err => observer.error(err),
            () => observer.complete(),
        );
        return () => {
          // cleanup when observer unsubscribe or producer completes or errors
          subscription.unsubscribe();
        };
      });
    }

    const producer1 = hot(' -a-b-c-d-e-f-g-h-i-j|');
    const obsvable1 = createHotObservableFromColdProducer(producer1);
    const obsvable1SubsM = '--^                  ';
    const expected1 = hot(' ---b-c-d-e-f-g-h-i-j|');
    const obsvable2 = obsvable1.pipe(take(2));
    const obsvable2SubsM = '----^                ';
    const expected2 = hot(' -----c-(d|)          ');
    const producer1Subs = ['--^-----------------!',  /// subscribed for observer 1
      /*                */ '----^--!             '];  // subscribed for observer 2 and unsubscribed early

    getTestScheduler().expectObservable(obsvable1, obsvable1SubsM).toBe(expected1.marbles, expected1.values);
    getTestScheduler().expectObservable(obsvable2, obsvable2SubsM).toBe(expected2.marbles, expected2.values);
    getTestScheduler().expectSubscriptions(producer1.getSubscriptions()).toBe(producer1Subs);
  });
});

/**
 * Operator fromEventPattern is a flexible creation operator. It can simulate all
 * cases of fromEvent and other patterns.
 */
describe('Creation operator fromEventPattern', () => {
  it('should simulate fromEvent with DOM event listener', () => {
    const listenerRegistrationRecorder = new ReplaySubject<string>(undefined, undefined, getTestScheduler());

    function createEventStream(element: Element, type: string): Observable<Event> {
      return fromEventPattern<Event>(
          (handler) => {
            element.addEventListener(type, handler);
            listenerRegistrationRecorder.next('r');
          },
          handler => {
            document.removeEventListener(type, handler);
            listenerRegistrationRecorder.next('u');
          },
      );
    }

    const clicks: Observable<Event> = createEventStream(document.documentElement, 'click');
    const doClicks = cold('--c--c--c|').pipe(
        tap(() => document.documentElement.click()),
    );
    getTestScheduler().expectObservable(doClicks, '^').toBe('--c--c--c|');
    getTestScheduler().expectObservable(clicks.pipe(map(() => 'x')), '^------!').toBe('--x--x');
    getTestScheduler().expectObservable(listenerRegistrationRecorder).toBe('r------u');
  });

  it('should simulate Angular Renderer2', () => {
    const listenerRegistrationRecorder = new ReplaySubject<string>(undefined, undefined, getTestScheduler());

    class Renderer2 {
      listen(target: Element, eventName: string, callback: (event: Event) => void): () => void {
        target.addEventListener(eventName, callback);
        listenerRegistrationRecorder.next('r');
        // return unListener
        return () => {
          target.removeEventListener(eventName, callback);
          listenerRegistrationRecorder.next('u');
        };
      }
    }

    function createEventStream(renderer2: Renderer2, element: Element, type: string): Observable<Event> {
      return fromEventPattern<Event>(
          (handler) => {
            // return unListener
            return renderer2.listen(element, type, handler);
          },
          (handler, unListener) => unListener(),
      );
    }

    const clicks: Observable<Event> = createEventStream(new Renderer2(), document.documentElement, 'click');
    const doClicks = cold('--c--c--c|').pipe(
        tap(() => document.documentElement.click()),
    );
    getTestScheduler().expectObservable(doClicks, '^').toBe('--c--c--c|');
    getTestScheduler().expectObservable(clicks.pipe(map(() => 'x')), '^------!').toBe('--x--x');
    getTestScheduler().expectObservable(listenerRegistrationRecorder).toBe('r------u');
  });
});

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
    const xSubs = ['^------!'];
    const ySubs = ['^--!    '];
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
  });
});

describe('Creation operator concat()', () => {
  it('should finish one flow before starting another', () => {
    const x = cold('-a-b-|    ');  // must be finite for y to subscribe
    const y = cold('     -c-d|');
    const o = concat(x, y);
    const e = cold('-a-b--c-d|');
    const xSubs = ['^----!    '];
    const ySubs = ['-----^---!'];
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
  });
});

describe('Creation operator onErrorResumeNext()', () => {
  it('should continue with next flow without error', () => {
    const x = cold('-a-b-#    ');  // must be finite for y to subscribe
    const y = cold('     -c-d#');
    const o = onErrorResumeNext(x, y);
    const e = cold('-a-b--c-d|');
    const xSubs = ['^----!    '];
    const ySubs = ['-----^---!'];
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
  });
});

describe('Creation operator combineLatest()', () => {
  it('should wait until each flow emits at least once and finish when all flows finish', () => {
    const x = cold('-x-y-z-|');
    const y = cold('--a-b|  ');
    const o = combineLatest([x, y]).pipe(map(([x, y]) => `${x}${y}`));
    const e = cold('--ABCD-|', {A: 'xa', B: 'ya', C: 'yb', D: 'zb'});
    const xSubs = ['^------!'];
    const ySubs = ['^----!  '];
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
  });

  it('should be able to use like operator', () => {
    const x = cold('x|');
    const y = cold('--a-b-c|');
    const e = cold('--A-B-C|', {A: 'xa', B: 'xb', C: 'xc'});
    const o = x.pipe(
        stream => combineLatest([stream, y]),
        map(([x, y]) => `${x}${y}`),
    );
    expect(o).toBeObservable(e);
  });
});

describe('Creation operator zip()', () => {
  it('should match each element from one flow to the corresponding element in the other flow', () => {
    const x = cold('-x-y-z-|');
    const y = cold('--a-b|  ');
    const o = zip(x, y);
    const e = cold('--A-B|  ', {A: ['x', 'a'], B: ['y', 'b']});
    const xSubs = ['^----!  ']; // x is unsubscribed early
    const ySubs = ['^----!  '];
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
  });

  it('should not terminate until all possible matches are emitted even though one stream is terminated', () => {
    const x = cold('----------x-y-z-|');
    const y = cold('--abcdef|        ');
    const o = zip(x, y).pipe(map(([x, y]) => `${x}${y}`));
    const e = cold('----------A-B-C-|', {A: 'xa', B: 'yb', C: 'zc'});
    const xSubs = ['^---------------!'];
    const ySubs = ['^-------!        '];
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
  });
});

describe('Creation operator forkJoin()', () => {
  it('should wait till all done', () => {
    const x = cold('-a-b-c--|   ');
    const y = cold('--d-e-|     ');
    const z = cold('-f---g-|    ');
    const o = forkJoin([x, y, z]);
    const e = cold('--------(A|)', {A: ['c', 'e', 'g']});
    const xSubs = ['^-------!   '];
    const ySubs = ['^-----!     '];
    const zSubs = ['^------!    '];
    expect(o).toBeObservable(e);
    // Note: x, y, z must be finite for o to emit.
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
  });

  it('should emit nothing if one does not emit nothing', () => {
    const x = cold('-a-b-c--|');
    const y = cold('---|     ');
    const z = cold('-f---g-| ');
    const o = forkJoin([x, y, z]);
    const e = cold('---|     ');
    const xSubs = ['^--!     '];
    const ySubs = ['^--!     ']; // y unsubscribed early
    const zSubs = ['^--!     ']; // z unsubscribed early
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
  });

  it('should throw error if one throws error', () => {
    const x = cold('-a-b-c--|');
    const y = cold('--d-e#   ');
    const z = cold('-f---g-| ');
    const o = forkJoin([x, y, z]);
    const e = cold('-----#   ');
    const xSubs = ['^----!   '];
    const ySubs = ['^----!   ']; // y unsubscribed early
    const zSubs = ['^----!   ']; // z unsubscribed early
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
  });
});

describe('Creation operator race()', () => {
  it('should select flow that emits first', () => {
    const x = cold('--a-b-c--|');
    const y = cold('--d-e#    ');
    const z = cold('-f---g-|  ');
    const o = race([x, y, z]);
    const e = cold('-f---g-|  ');
    const xSubs = ['^!        ']; // x is unsubscribed early
    const ySubs = ['^!        ']; // y is unsubscribed early
    const zSubs = ['^------!  '];
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
  });

  it('should select flow with first event if that event is error', () => {
    const x = cold('--a-b-c--|');
    const y = cold('--d-e#    ');
    const z = cold('-#        ');
    const o = race(x, y, z);
    const e = cold('-#        ');
    const xSubs = ['^!        ']; // x is unsubscribed early
    const ySubs = ['^!        ']; // y is unsubscribed early
    const zSubs = ['^!        '];
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
  });

  it('should select flow with first event even if that event is complete', () => {
    const x = cold('--a-b-c--|');
    const y = cold('--d-e#    ');
    const z = cold('-|        ');
    const o = race(x, y, z);
    const e = cold('-|        ');
    const xSubs = ['^!        ']; // x is unsubscribed early
    const ySubs = ['^!        ']; // y is unsubscribed early
    const zSubs = ['^!        '];
    expect(o).toBeObservable(e);
    expect(x).toHaveSubscriptions(xSubs);
    expect(y).toHaveSubscriptions(ySubs);
    expect(z).toHaveSubscriptions(zSubs);
  });
});

describe('Creation operator defer()', () => {
  it('should only run when subscribed', () => {
    const x = cold('x-y|  ');
    const o = defer(() => x);
    const xSubsM = '--^   ';
    const e = cold('--x-y|');
    const xSubs = ['--^--!'];
    getTestScheduler().expectObservable(o, xSubsM).toBe(e.marbles, e.values);
    getTestScheduler().expectSubscriptions(x.getSubscriptions()).toBe(xSubs);
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

describe('Creation operator iif()', () => {
  /** @see defer : iif functionality can be achieved with defer. */
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

  for (const externalCondition of [false, true]) {
    /** @see custom operator pipeIf() */
    it(`should support conditional pipe % externalCondition=${externalCondition}`, () => {
      let condition = false;
      const x = cold('X-y-z|');
      const o = x.pipe(
          stream => iif(() => condition,
              pipe(
                  filter((v: string) => v !== 'y'),
                  map(v => v.toUpperCase()),
              )(stream),
              pipe(
                  filter((v: string) => v !== 'z'),
                  map(v => v.toLowerCase()),
              )(stream)),
      );
      // Change condition before subscription
      condition = externalCondition;
      if (externalCondition) {
        expect(o).toBeObservable(cold('X---Z|'));
      } else {
        expect(o).toBeObservable(cold('x-y--|'));
      }
    });
  }
});

describe('Creation operator timer()', () => {
  it('should create flow with delay', () => {
    const delay = time('----|');
    const o = timer(delay, getTestScheduler()).pipe(map(v => `${v}`));
    const e = cold('----(0|)');
    expect(o).toBeObservable(e);
  });

  it('should create flow with delay and repeated emissions', () => {
    const delay = time('----------|'); // 100ms since 10ms per frame
    const period = time('---|'); // 30ms
    const o = timer(delay, period, getTestScheduler())
        .pipe(take(6), map(v => `${v}`));
    const e = cold('----------0--1--2--3--4--(5|)');
    expect(o).toBeObservable(e);
  });
});
