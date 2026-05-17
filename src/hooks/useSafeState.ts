import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useIsMounted } from "./useSafeEffect";

export function useSafeState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>] {
  const [state, unsafeSetState] = useState<S>(initial);
  const mounted = useIsMounted();

  const setState = useCallback(
    (value: SetStateAction<S>) => {
      if (!mounted.current) return;
      unsafeSetState(value);
    },
    [mounted],
  );

  return [state, setState];
}
