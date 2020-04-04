import {combineLatest, MonoTypeOperatorFunction, Observable} from "rxjs";
import {map, take} from "rxjs/operators";

/**
 * Waits until each input observable emits at least one. This is different from
 * skipUntil().
 */
export function waitUntil<T>(...observables: Array<Observable<unknown>>):
    MonoTypeOperatorFunction<T> {
  return input$ => combineLatest([
    input$,
    ...observables.map(o => o.pipe(take(1))),
  ]).pipe(
      map(([value]) => value as T),
  );
}
