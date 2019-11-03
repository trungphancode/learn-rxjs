/**
 * Demonstrates how rxjs operators are used.
 * @see https://rxmarbles.com
 * @see https://github.com/ReactiveX/rxjs/tree/master/spec/operators
 */
import {cold} from 'jasmine-marbles';
import {pipe, throwError} from 'rxjs';
import {catchError, combineAll, concatAll, concatMap, exhaust, exhaustMap, filter, finalize, map, mergeAll, mergeMap, repeat, switchAll, switchMap, takeUntil, tap, zipAll} from 'rxjs/operators';


describe('Operators', async () => {
});
