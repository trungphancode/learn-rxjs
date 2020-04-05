import {cold} from "jasmine-marbles";
import {pipe} from "rxjs";
import {filter, map} from "rxjs/operators";
import {pipeIf} from "./pipe_if";

describe('Custom operator pipeIf()', () => {
  for (const externalCondition of [false, true]) {
    it(`should support conditional pipe % externalCondition=${externalCondition}`, () => {
      let condition = false;
      const x = cold('X-y-z|');
      const o = x.pipe(
          pipeIf(() => condition,
              pipe(
                  filter(v => v !== 'y'),
                  map(v => v.toUpperCase()),
              ),
              map(v => v.toLowerCase()),
          ),
      );
      // Change condition before subscription
      condition = externalCondition;
      if (externalCondition) {
        expect(o).toBeObservable(cold('X---Z|'));
      } else {
        expect(o).toBeObservable(cold('x-y-z|'));
      }
    });
  }
});
