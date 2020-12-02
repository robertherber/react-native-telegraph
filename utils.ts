import 'react-native-get-random-values';
import { nanoid } from 'nanoid';
import { useRef } from 'react';

import { Action, RawAction } from './types';


export const mapActionToRawAction = (onPressHide: RawAction['onPress']) => (
  a: Action,
): RawAction => a.onPress === 'hide'
  ? { label: a.label, onPress: onPressHide }
  : a as RawAction;

export const getNanoID = (): string => nanoid();

export function useDeepMemo<T>(value: T): T {
  const ref = useRef<{ str: string, value: T | undefined}>({ str: '', value: undefined });
  const str = JSON.stringify(value);
  if (ref.current.str === '' || str !== ref.current.str) {
    ref.current = { value, str };
  }

  return ref.current.value as T;
}
