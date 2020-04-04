import {cold} from "jasmine-marbles";

/**
 * Advances time. For example: advance 2 frames: '--|', advance 13ms: '13ms |'.
 */
export function advanceTime(marbleString: string): void {
  expect(cold(marbleString)).toBeObservable(cold(marbleString));
}
