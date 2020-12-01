import 'react-native-get-random-values';
import { nanoid } from 'nanoid';
import { useRef } from 'react';


export type Action = {
  onPress: 'hide' | ((messageId: string) => void)
  label: string
}

export type RawAction = {
  onPress: ((messageId: string) => void)
  label: string
}

export const mapActionToRawAction = (onPressHide: RawAction['onPress']) => (
  a: Action,
): RawAction => a.onPress === 'hide'
  ? { label: a.label, onPress: onPressHide }
  : a as RawAction;

export const getNanoID = (): string => nanoid();

export function useDeepMemo<T>(value: T): T {
  const ref = useRef<{ str: string, value: T | undefined}>({ str: '', value: undefined });
  const str = JSON.stringify(value);
  if (ref.current.str === '' || str !== JSON.stringify(ref.current)) {
    ref.current = { value, str };
  }

  return ref.current.value as T;
}
