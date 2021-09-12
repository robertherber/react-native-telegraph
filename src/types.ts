export type Action<T = unknown> = {
  onPress?: ((messageId: string, text?: string) => T | PromiseLike<T> | undefined),
  label: string,
  dismiss?: boolean
}

export type RawAction = {
  onPress: (messageId: string, text?: string) => void,
  label: string
  dismiss: boolean
}
