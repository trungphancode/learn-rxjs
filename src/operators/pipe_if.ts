import {ObservableInput, UnaryFunction} from "rxjs/src/internal/types";
import {defer} from "rxjs";

/**
 * Conditionally selects pipe for the stream. The condition is evaluated at
 * subscription time.
 */
export function pipeIf<T, R>(
    condition: () => boolean,
    truePipe: UnaryFunction<T, R>,
    falsePipe: UnaryFunction<T, R>) {
  return (stream: T) => defer(() => {
    if (condition()) {
      return truePipe(stream) as unknown as ObservableInput<unknown>;
    } else {
      return falsePipe(stream) as unknown as ObservableInput<unknown>;
    }
  });
}
