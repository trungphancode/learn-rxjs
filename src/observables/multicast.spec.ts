/**
 * Understands how multicast works.
 *
 * Subject: help turn cold observable to hot. It can serve as both observable
 * and observer. Other variants: ReplaySubject, BehaviorSubject, AsyncSubject.
 *
 * To turn a cold observable to hot observable, we just need to make the
 * Subject subscribes to the source cold observable:
 *
 * source.subscribe(subject);
 *
 * If this subscription lasts till the end (i.e. either the source completes or
 * throws error), the subject will observe this end-flow event, hence also
 * complete (or throw error). But if the source is unsubscribed early, the
 * subject never completes. This leads to some interesting edge cases (or even
 * leaks if wrongly used) for refCount() when using Subject (instead of Subject
 * factory). Specifically, the refCount will automatically unsubscribe the
 * source if ref count decreases to 0. So if this happens before the source
 * completes, the Subject does not complete, so when the ref count increases,
 * it subscribes the source again and the Subject continues to serve.
 *
 * The publish() operator can be used to simplify turning cold to hot and help
 * encapsulating the underlying Subject object. The publish() operator is
 * essentially the same as multicast(new Subject()). Other variants are
 * publishReplay(N), publishBehavior(), publishLast() to be corresponding to
 * multicast(new ReplaySubject(N)), multicast(new BehaviorSubject()) and
 * multicast(new AsyncSubject()).
 *
 * ReplaySubject(N) replays the last N values if exists to new subscribers
 * before emitting next values from the underlying observable. ReplaySubject()
 * replays all previous values to new subscribers.
 *
 * If subscribed at the beginning, the ReplaySubject(N) may not emit any value
 * at the beginning because no previous values emitted (unless next value is
 * emitted right at the beginning).
 *
 * An empty ReplaySubject won't emit any value no matter when subscribed. A
 * completed ReplaySubject(N) emits the last N values to the new subscribers.
 *
 * BehaviorSubject: has an initial value and emits its current value
 * whenever it is subscribed to. On a surface level, it's similar to
 * ReplaySubject(1), but different behavior at the beginning and when completed.
 *
 * Unlike ReplaySubject(1), when subscribed at the beginning, the
 * BehaviorSubject emits the initial value and then next values from the
 * underlying observable.
 *
 * Also unlike ReplaySubject(1), An empty BehaviorSubject will emit the initial
 * value if subscribed at the beginning. A completed BehaviorSubject does not
 * emit any value if subscribed.
 *
 * AsyncSubject: only emits a value when it completes. The value emitted is the
 * last value. An empty AsyncSubject does not emit any value.
 */
import {cold, getTestScheduler} from 'jasmine-marbles';
import {
  multicast,
  publishBehavior,
  publishLast,
  publishReplay,
  take
} from 'rxjs/operators';
import {
  AsyncSubject,
  BehaviorSubject,
  ConnectableObservable,
  ReplaySubject,
  Subject
} from 'rxjs';


describe('Subject', () => {
  it('should turn cold to hot', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = ['^--------------!']; // only one expected subscription from source.subscribe(hotPublished)
    const hotPublished = new Subject<string>(); // This hotPublished turns cold source into hot.
    const observer1 = new ReplaySubject<string>();
    hotPublished.subscribe(observer1);
    const observer2 = hotPublished.pipe(take(2));
    source.subscribe(hotPublished); // This is similar to connect() in the version below

    const laterObserver = hotPublished;

    getTestScheduler().expectObservable(observer1).toBe('--1-2---3-4--5-|');
    getTestScheduler().expectObservable(observer2, '---^').toBe('----2---(3|)');
    getTestScheduler().expectObservable(laterObserver, '----------------------^').toBe('----------------------|');
    getTestScheduler().expectSubscriptions(source.getSubscriptions()).toBe(sourceSubs);
  });

  it('should turn cold to hot with using publish() or multicast(new Subject())', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = ['^--------------!']; // only one expect subscription from hotPublished.connect()
    const hotPublished = source.pipe(multicast(new Subject<string>())) as ConnectableObservable<string>;
    const observer1 = new ReplaySubject<string>();
    hotPublished.subscribe(observer1);
    const observer2 = hotPublished.pipe(take(2));

    const laterObserver = hotPublished;

    getTestScheduler().expectObservable(observer1).toBe('--1-2---3-4--5-|');
    getTestScheduler().expectObservable(observer2, '---^').toBe('----2---(3|)');
    getTestScheduler().expectObservable(laterObserver, '----------------------^').toBe('----------------------|');
    getTestScheduler().expectSubscriptions(source.getSubscriptions()).toBe(sourceSubs);
    hotPublished.connect(); // connect() once, any subsequent connect() is ignored
  });
});

describe('ReplaySubject(1)', () => {
  it('should turn cold to hot with "Replay(1)" feature', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = ['^--------------!']; // only one expected subscription from source.subscribe(hotPublished)
    const hotPublished = new ReplaySubject<string>(1); // This hotPublished turns cold source into hot.
    const observer1 = new ReplaySubject<string>();
    hotPublished.subscribe(observer1);
    const observer2 = hotPublished.pipe(take(3));
    source.subscribe(hotPublished); // This is similar to connect() in the version below

    const laterObserver = hotPublished;

    getTestScheduler().expectObservable(observer1).toBe('--1-2---3-4--5-|');
    getTestScheduler().expectObservable(observer2, '---^').toBe('---12---(3|)');
    getTestScheduler().expectObservable(laterObserver, '----------------------^').toBe('----------------------(5|)');
    getTestScheduler().expectSubscriptions(source.getSubscriptions()).toBe(sourceSubs);
  });

  it('should turn cold to hot using publishReplay(1) or multicast(new ReplaySubject(1))', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = ['^--------------!']; // only one expect subscription from hotPublished.connect()
    const hotPublished = source.pipe(multicast(new ReplaySubject<string>(1))) as ConnectableObservable<string>;
    const observer1 = new ReplaySubject<string>();
    hotPublished.subscribe(observer1);
    const observer2 = hotPublished.pipe(take(3));

    const laterObserver = hotPublished;

    getTestScheduler().expectObservable(observer1).toBe('--1-2---3-4--5-|');
    getTestScheduler().expectObservable(observer2, '---^').toBe('---12---(3|)');
    getTestScheduler().expectObservable(laterObserver, '----------------------^').toBe('----------------------(5|)');
    getTestScheduler().expectSubscriptions(source.getSubscriptions()).toBe(sourceSubs);
    hotPublished.connect(); // connect() once, any subsequent connect() is ignored
  });

  it('should emit nothing for empty observable', () => {
    const source = cold('|');
    const hotPublished = source.pipe(publishReplay(1)) as ConnectableObservable<string>;
    getTestScheduler().expectObservable(hotPublished).toBe('|');
    getTestScheduler().expectObservable(hotPublished, '-^').toBe('-|');
    hotPublished.connect();
  });
});

describe('BehaviorSubject()', () => {
  it('should turn cold to hot with Behavior feature', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = ['^--------------!']; // only one expected subscription from source.subscribe(hotPublished)
    const hotPublished = new BehaviorSubject<string>('0'); // This hotPublished turns cold source into hot.
    const observer1 = new ReplaySubject<string>();
    hotPublished.subscribe(observer1);
    const observer2 = hotPublished.pipe(take(3));
    source.subscribe(hotPublished); // This is similar to connect() in the version below

    const laterObserver = hotPublished;

    getTestScheduler().expectObservable(observer1).toBe('0-1-2---3-4--5-|');
    // observer2's pattern is similar to observer2' pattern of ReplaySubject(1)
    getTestScheduler().expectObservable(observer2, '---^').toBe('---12---(3|)');
    getTestScheduler().expectObservable(laterObserver, '----------------------^').toBe('----------------------|');
    getTestScheduler().expectSubscriptions(source.getSubscriptions()).toBe(sourceSubs);
  });

  it('should turn cold to hot using publishBehavior() or multicast(new BehaviorSubject())', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = ['^--------------!']; // only one expect subscription from hotPublished.connect()
    const hotPublished = source.pipe(multicast(new BehaviorSubject<string>('0'))) as ConnectableObservable<string>;
    const observer1 = new ReplaySubject<string>();
    hotPublished.subscribe(observer1);
    const observer2 = hotPublished.pipe(take(3));

    const laterObserver = hotPublished;

    getTestScheduler().expectObservable(observer1).toBe('0-1-2---3-4--5-|');
    // observer2's pattern is similar to observer2' pattern of ReplaySubject(1)
    getTestScheduler().expectObservable(observer2, '---^').toBe('---12---(3|)');
    getTestScheduler().expectObservable(laterObserver, '----------------------^').toBe('----------------------|');
    getTestScheduler().expectSubscriptions(source.getSubscriptions()).toBe(sourceSubs);
    hotPublished.connect(); // connect() once, any subsequent connect() is ignored
  });

  it('should emit initial value for empty observable if subscribed at the beginning', () => {
    const source = cold('|');
    const hotPublished = source.pipe(publishBehavior('0')) as ConnectableObservable<string>;
    getTestScheduler().expectObservable(hotPublished).toBe('(0|)');
    getTestScheduler().expectObservable(hotPublished, '-^').toBe('-|');
    hotPublished.connect();
  });
});

describe('AsyncSubject()', () => {
  it('should turn cold to hot with Async feature', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = ['^--------------!']; // only one expected subscription from source.subscribe(hotPublished)
    const hotPublished = new AsyncSubject<string>(); // This hotPublished turns cold source into hot.
    const observer1 = new ReplaySubject<string>();
    hotPublished.subscribe(observer1);
    const observer2 = hotPublished.pipe(take(2));
    source.subscribe(hotPublished); // This is similar to connect() in the version below

    const laterObserver = hotPublished;

    getTestScheduler().expectObservable(observer1).toBe('---------------(5|)');
    getTestScheduler().expectObservable(observer2, '---^').toBe('---------------(5|)');
    getTestScheduler().expectObservable(laterObserver, '----------------------^').toBe('----------------------(5|)');
    getTestScheduler().expectSubscriptions(source.getSubscriptions()).toBe(sourceSubs);
  });

  it('should turn cold to hot using publishLast(1) or multicast(new AsyncSubject())', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = ['^--------------!']; // only one expect subscription from hotPublished.connect()
    const hotPublished = source.pipe(multicast(new AsyncSubject<string>())) as ConnectableObservable<string>;
    const observer1 = new ReplaySubject<string>();
    hotPublished.subscribe(observer1);
    const observer2 = hotPublished.pipe(take(3));

    const laterObserver = hotPublished;

    getTestScheduler().expectObservable(observer1).toBe('---------------(5|)');
    getTestScheduler().expectObservable(observer2, '---^').toBe('---------------(5|)');
    getTestScheduler().expectObservable(laterObserver, '----------------------^').toBe('----------------------(5|)');
    getTestScheduler().expectSubscriptions(source.getSubscriptions()).toBe(sourceSubs);
    hotPublished.connect(); // connect() once, any subsequent connect() is ignored
  });

  it('should emit nothing for empty observable', () => {
    const source = cold('|');
    const hotPublished = source.pipe(publishLast()) as ConnectableObservable<string>;
    getTestScheduler().expectObservable(hotPublished).toBe('|');
    getTestScheduler().expectObservable(hotPublished, '-^').toBe('-|');
    hotPublished.connect();
  });
});
