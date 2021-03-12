import 'react-native-get-random-values';
import { nanoid } from 'nanoid';
import { useRef } from 'react';

import { Action, RawAction } from './types';


export function mapActionToRawAction<T = unknown>(onPressHide: RawAction['onPress'], resolve: (value: T | PromiseLike<T> | undefined) => void) {
  return (
    a: Action<T>,
  ): RawAction => ({
    label: a.label,
    onPress: (messageId: string) => {
      const { onPress } = a;

      if (onPress) {
        const val = onPress(messageId);
        resolve(val);
      }
      if (a.dismiss === undefined || a.dismiss === true) {
        onPressHide(messageId);
      }
    },
  });
}

export const getNanoID = (): string => nanoid();

export function useDeepMemo<T>(value: T): T {
  const ref = useRef<{ str: string, value: T | undefined}>({ str: '', value: undefined });
  const str = JSON.stringify(value);
  if (ref.current.str === '' || str !== ref.current.str) {
    ref.current = { value, str };
  }

  return ref.current.value as T;
}
