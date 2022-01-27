export type Id = symbol | string | number;

export type Action<TButtonId extends Id = Id> = {
  buttonId?: TButtonId,
  label: string,
}


