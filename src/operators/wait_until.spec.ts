import {cold} from 'jasmine-marbles';
import {waitUntil} from './wait_until';


describe('Custom operator waitUntil()', () => {
  it('should wait all gating observables to emit', ()  => {
    const x = cold('-x-y-----z|');
    const a = cold('------a|');
    const b = cold('b|');
    const c = cold('--c|');
    const o = x.pipe(waitUntil(a, b, c));
    const e = cold('------y--z|');
    expect(o).toBeObservable(e);
  });
});
