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
