export type Action = {
  onPress: 'hide' | ((messageId: string) => void)
  label: string
}

export type RawAction = {
  onPress: ((messageId: string) => void)
  label: string
}

