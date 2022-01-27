import { useRef } from 'react';


export const getRandomID = (): string => `_${Math.random().toString(36).substr(2, 9)}`;

export function useDeepMemo<T>(value: T): T {
  const ref = useRef<{ str: string, value: T | undefined}>({ str: '', value: undefined });
  const str = JSON.stringify(value);
  if (ref.current.str === '' || str !== ref.current.str) {
    ref.current = { value, str };
  }

  return ref.current.value as T;
}
