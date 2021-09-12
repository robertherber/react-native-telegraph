import { useRef } from 'react';

import { Action, RawAction } from './types';


export function mapActionToRawAction<T = unknown>(onPressHide: RawAction['onPress'], resolve: (value: T | PromiseLike<T> | undefined) => void) {
  return (
    a: Action<T>,
  ): RawAction => ({
    label: a.label,
    dismiss: !!a.dismiss,
    onPress: (messageId: string, text?: string) => {
      const { onPress } = a;

      if (onPress) {
        const val = onPress(messageId, text);
        resolve(val);
      }
      if (a.dismiss === undefined || a.dismiss === true) {
        onPressHide(messageId);
      }
    },
  });
}

export const getRandomID = (): string => `_${Math.random().toString(36).substr(2, 9)}`;

export function useDeepMemo<T>(value: T): T {
  const ref = useRef<{ str: string, value: T | undefined}>({ str: '', value: undefined });
  const str = JSON.stringify(value);
  if (ref.current.str === '' || str !== ref.current.str) {
    ref.current = { value, str };
  }

  return ref.current.value as T;
}
