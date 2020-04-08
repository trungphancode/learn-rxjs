/**
 * Understands refCount().
 *
 * The refCount operator automatically connects ConnectableObservable, keeps
 * reference count of the subscribers and automatically unsubscribe to the
 * original source when ref count < 1.
 *
 * After the original source as unsubscribed when ref count decreases to 0, the
 * behavior is different when the underlying Subject for the multicast is a
 * factory or not. If it's a factory, it will automatically re-subscribe to
 * the source when the ref count > 0 again.
 *
 * Note that multicast(() => new Subject()), refCount() is the same as share(),
 * while multicast(new Subject(), refCount()) is the same as
 * publish(), refCount().
 *
 * Other variants or share is: shareReplay(), but ...
 *
 * The shareReplay{{refCount: true, bufferSize: N}} is the same as
 * multicast(() => new ReplaySubject(N)).
 *
 * The shareReplay(N) is shareReplay({refCount: false, bufferSize: N})
 * to make it backwards compatible. So what is shareReplay(N)? shareReplay(N)
 * is to address the common pattern of caching RPC result. The shareReplay(N)
 * does not unsubscribe the original source until the source completes, so that
 * even if the client unsubscribe the shared pipe, the RPC continues to wait for
 * the result and if the client subscribe again, it will leverage this shared
 * value instead of making new RPC request. In most cases, shareReplay(N) is
 * similar to publishReplay(1), refCount(); but has subtle difference such that
 * shareReplay(N) is almost always better. Specifically, shareReplay(N) only
 * subscribe the source once, but publishReplay(1), refCount() can make
 * multiple subscriptions to source in edge cases.
 *
 * But if the source never completes, shareReplay(N) will lead to the leaks, in
 * that case, shareReplay({refCount: true, bufferSize: N}) should be used
 * instead.
 */
import {cold, getTestScheduler} from 'jasmine-marbles';
import {multicast, publishReplay, refCount, shareReplay} from 'rxjs/operators';
import {Subject} from 'rxjs';

describe('refCount with multicast Subject', () => {
  it('should automatically connect when first subscribed', () => {
    const original = cold('--1-2---3-4--5-|                   ');
    const originalSubs = ['--^--------------!                 '];
    const producer = original.pipe(multicast(new Subject()), refCount());
    const obsvble1SubsM = '--^                                ';
    const obsvble2SubsM = '-----^                             ';
    const obsvble3SubsM = '-------------------^               ';
    const expcObsvble1M = '----1-2---3-4--5-|                 ';
    const expcObsvble2M = '------2---3-4--5-|                 ';
    const expcObsvble3M = '-------------------|               ';

    getTestScheduler().expectObservable(producer, obsvble1SubsM).toBe(expcObsvble1M);
    getTestScheduler().expectObservable(producer, obsvble2SubsM).toBe(expcObsvble2M);
    getTestScheduler().expectObservable(producer, obsvble3SubsM).toBe(expcObsvble3M);
    getTestScheduler().expectSubscriptions(original.getSubscriptions()).toBe(originalSubs);
  });

  /**
   * This test case demonstrates that if refCount() unsubscribe early, the
   * Subject does not complete, hence when refCount() is subscribe again, it
   * will subscribe to the original source again.
   */
  it('should not complete Subject if unsubscribed early', () => {
    const original = cold('  --1-2---3-4--5-|                 ');
    const originalSubs = ['--^---------!                      ', /// since the source is unsubscribed early, the Subject does not complete here
      /*               */ '-------------------^--------------!']; // leading to second subscription to the source.
    const producer = original.pipe(multicast(new Subject()), refCount());
    const obsvble1SubsM = '--^     !                          ';
    const obsvble2SubsM = '-----^      !                      ';
    const obsvble3SubsM = '-------------------^               ';
    const expcObsvble1M = '----1-2-                           ';
    const expcObsvble2M = '------2---3-                       ';
    const expcObsvble3M = '---------------------1-2---3-4--5-|';

    getTestScheduler().expectObservable(producer, obsvble1SubsM).toBe(expcObsvble1M);
    getTestScheduler().expectObservable(producer, obsvble2SubsM).toBe(expcObsvble2M);
    getTestScheduler().expectObservable(producer, obsvble3SubsM).toBe(expcObsvble3M);
    getTestScheduler().expectSubscriptions(original.getSubscriptions()).toBe(originalSubs);
  });
});

describe('refCount with multicast Subject factory', () => {
  it('should automatically connect when first subscribed and connect again if completed', () => {
    const original = cold('--1-2---3-4--5-|                   ');
    const originalSubs = ['--^--------------!                 ',
      /*               */ '                   ^--------------!'];
    const producer = original.pipe(multicast(() => new Subject()), refCount());
    const obsvble1SubsM = '--^                                ';
    const obsvble2SubsM = '-----^                             ';
    const obsvble3SubsM = '-------------------^               ';
    const expcObsvble1M = '----1-2---3-4--5-|                 ';
    const expcObsvble2M = '------2---3-4--5-|                 ';
    const expcObsvble3M = '---------------------1-2---3-4--5-|';

    getTestScheduler().expectObservable(producer, obsvble1SubsM).toBe(expcObsvble1M);
    getTestScheduler().expectObservable(producer, obsvble2SubsM).toBe(expcObsvble2M);
    getTestScheduler().expectObservable(producer, obsvble3SubsM).toBe(expcObsvble3M);
    getTestScheduler().expectSubscriptions(original.getSubscriptions()).toBe(originalSubs);
  });
});

describe('shareReplay(1)', () => {
  it('should complete the cold observable', () => {
    const rpc = cold('----x|         ');
    const rpcSubs = ['--^----!       ']; // only subscribe once
    const shared = rpc.pipe(shareReplay(1));
    const ob1SubsM = '--^ !          ';
    const ob2SubsM = '-----^         ';
    const ob3SubsM = '-----------^   ';
    const expcOb1M = '--             ';
    const expcOb2M = '------x|       ';
    const expcOb3M = '-----------(x|)'; // get the last cached value

    getTestScheduler().expectObservable(shared, ob1SubsM).toBe(expcOb1M);
    getTestScheduler().expectObservable(shared, ob2SubsM).toBe(expcOb2M);
    getTestScheduler().expectObservable(shared, ob3SubsM).toBe(expcOb3M);
    getTestScheduler().expectSubscriptions(rpc.getSubscriptions()).toBe(rpcSubs);
  });

  it('can be different from publishReplay(1), refCount() in edge case', () => {
    const rpc = cold('----x|         ');
    const rpcSubs = ['--^-!          ', /// unsubscribed early => ReplaySubject not complete
      /*          */ '-----^----!    ']; // lead to second subscription
    const shared = rpc.pipe(publishReplay(1), refCount());
    const ob1SubsM = '--^ !          ';
    const ob2SubsM = '-----^         ';
    const ob3SubsM = '-----------^   ';
    const expcOb1M = '--             ';
    const expcOb2M = '---------x|    ';
    const expcOb3M = '-----------(x|)'; // get the last cached value

    getTestScheduler().expectObservable(shared, ob1SubsM).toBe(expcOb1M);
    getTestScheduler().expectObservable(shared, ob2SubsM).toBe(expcOb2M);
    getTestScheduler().expectObservable(shared, ob3SubsM).toBe(expcOb3M);
    getTestScheduler().expectSubscriptions(rpc.getSubscriptions()).toBe(rpcSubs);
  });
});
