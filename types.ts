export type Action<T = unknown> = {
  onPress?: ((messageId: string) => T | PromiseLike<T> | undefined),
  label: string,
  dismiss?: boolean
}

export type RawAction = {
  onPress: (messageId: string) => void,
  label: string
}
