import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  BackHandler, KeyboardAvoidingView, Platform, StyleSheet, View,
} from 'react-native';
import {
  Button, Dialog, Paragraph, TextInput, Portal,
} from 'react-native-paper';
import { TextInputProps } from 'react-native-paper/lib/typescript/components/TextInput/TextInput';

import deferred from './deferred';
import {
  Action, Id,
} from './types';
import {
  getRandomID,
  useDeepMemo,
} from './utils';


export type DialogData<TButtonId extends Id = Id, T = unknown> = {
  id: string,
  title: string,
  dismissable?: boolean,
  response: Promise<DialogResponse<TButtonId>>,
  description?: string,
  maxWidth?: number,
  buttons: Array<Action<TButtonId>>,
  inputProps?: Omit<Partial<TextInputProps>, 'value'>,
  status: 'hidden' | 'visible' | 'queued',
  data?: T,
  responseResolver: (value: DialogResponse) => void,
}

export type DialogOptions<TButtonId extends Id = Id, T = unknown> = {
  id?: string,
  message?: string,
  maxWidth?: number,
  description?: string,
  actions?: Array<Action<TButtonId>>,
  inputProps?: Partial<TextInputProps>,
  dismissable?: boolean,
  data?: T
}

const styles = StyleSheet.create({
  textInput: { marginHorizontal: 10 },
  flexOne: { flex: 1 },
  dialog: { width: '100%', alignSelf: 'center' },
});

type DialogStatus = 'dismissed' | 'buttonPressed' | 'inputSubmitted' | 'hiddenByExternalCall';

type DialogResponse<TButtonId extends Id = Id> = {
  buttonId?: TButtonId,
  textValue?: string,
  status: DialogStatus,
}

type ShowDialogHandle<TButtonId extends Id = Id> = {
  dialogId: string,
  hide: () => void,
  response: Promise<DialogResponse<TButtonId>>,
}

export type ShowDialogFn<TButtonId extends Id = Id> = (
  title: string,
  options?: DialogOptions
) => ShowDialogHandle<TButtonId>
export type ShowPromptFn<TButtonId extends Id = Id> = (
  title: string,
  options?: DialogOptions
) => ShowDialogHandle<TButtonId>;
export type HideDialogFn = (dialogId?: string) => boolean;

export type DialogContextData<TButtonId extends Id = Id> = {
  showDialog: ShowDialogFn<TButtonId>,
  hideDialog: HideDialogFn,
  dialogCount: number;
}

export const DialogContext = createContext<DialogContextData>({
  showDialog: () => ({
    dialogId: '',
    hide: () => {},
    response: Promise.resolve({ status: 'dismissed', buttonId: '', textValue: '' }),
  }),
  hideDialog: () => true,
  dialogCount: 0,
});

export type DialogComponentProps = {
  index: number,
  item: DialogData,
  cleanUpAfterAnimations: (dialogId: string) => void,
};


export const DefaultDialogComponent: React.FC<DialogComponentProps> = ({
  item,
  cleanUpAfterAnimations,
}) => {
  const textContentRef = useRef(item.inputProps?.defaultValue || '');

  useEffect(() => {
    if (item.status === 'hidden') {
      setTimeout(() => {
        cleanUpAfterAnimations(item.id);
      }, 300);
    }
  }, [item, cleanUpAfterAnimations]);

  const onDismissInternal = useCallback(() => {
    item.responseResolver({
      status: 'dismissed',
      buttonId: undefined,
      textValue: undefined,
    });
    return true;
  }, [item]);

  const onChangeText = useCallback((text: string) => {
    textContentRef.current = text;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && item.dismissable) {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onDismissInternal);
      return () => subscription.remove();
    }
    return () => {};
  }, [onDismissInternal, item.dismissable]);

  return useMemo(() => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flexOne}>
      <View style={styles.flexOne} pointerEvents='box-none' testID='dialog'>
        <Dialog
          visible={item.status === 'visible'}
          style={[styles.dialog, { maxWidth: item.maxWidth }]}
          onDismiss={item.dismissable !== false ? onDismissInternal : undefined}
        >
          <Dialog.Title>{ item.title }</Dialog.Title>
          { item.description
            ? (
              <Dialog.Content>
                <Paragraph>{ item.description }</Paragraph>
              </Dialog.Content>
            )
            : null }

          { item.inputProps ? (
            <TextInput
              {...item.inputProps}
              value={undefined}
              onChangeText={onChangeText}
              onSubmitEditing={() => {
                item.responseResolver({
                  status: 'inputSubmitted',
                  buttonId: undefined,
                  textValue: textContentRef.current,
                });
              }}
              style={styles.textInput}
            />
          ) : null}

          <Dialog.Actions>
            { item.buttons.map((a) => (
              <Button
                key={a.label}
                onPress={() => {
                  item.responseResolver({
                    status: 'buttonPressed',
                    buttonId: a.buttonId,
                    textValue: textContentRef.current,
                  });
                }}
              >
                {a.label}
              </Button>
            )) }
          </Dialog.Actions>

        </Dialog>

      </View>
    </KeyboardAvoidingView>
  ), [item, onChangeText, onDismissInternal]);
};


export type DialogProviderProps = {
  DialogComponent?: React.FC<DialogComponentProps>,
}

export const DialogProvider: React.FC<DialogProviderProps> = ({
  children, DialogComponent = DefaultDialogComponent,
}) => {
  const [dialogs, setDialogs] = useState<DialogData[]>([]),
        shownDialogs = useMemo(() => dialogs.slice(0, 1), [dialogs]),
        hideDialog = useCallback((dialogId: string) => {
          setDialogs((msgs) => msgs.map((m) => {
            if (m.id !== dialogId) {
              return m;
            }

            return { ...m, status: 'hidden' };
          }));
        }, []),
        cleanUpAfterAnimations = useCallback((dialogId: string) => {
          setDialogs((msgs) => msgs.filter((m) => m.id !== dialogId));
        }, []),
        showDialog = useCallback<ShowDialogFn>((title: string, opts?: DialogOptions) => {
          const dialogId = opts?.id || getRandomID(),
                hideSelf = () => hideDialog(dialogId),
                actions = opts?.actions || [{ label: 'Ok' }];

          const status = dialogs.length >= 1 ? 'queued' : 'visible';
          const {
            promise: response,
            resolve: responseResolver,
          } = deferred<DialogResponse>();

          setDialogs([...dialogs.filter((m) => m.id !== dialogId), {
            ...opts,
            title,
            id: dialogId,
            buttons: actions,
            status,
            // eslint-disable-next-line
            // @ts-ignore
            responseResolver,
            response,
          }]);

          void response.then(hideSelf);

          return {
            dialogId,
            hide: () => {
              responseResolver({
                status: 'hiddenByExternalCall',
                buttonId: undefined,
                textValue: undefined,
              });
            },
            response,
          };
        }, [hideDialog, dialogs]);

  useEffect(() => {
    const items = shownDialogs.filter((i) => i.status === 'queued'),
          ids = items.map((i) => i.id);

    if (ids.length > 0) {
      setDialogs((msgs) => msgs.map((m) => (ids.includes(m.id) ? { ...m, status: 'visible' } : m)));
    }
  }, [shownDialogs, hideDialog]);

  const hideDialogExternal = useCallback((dialogIdProp?: string) => {
    const dialogId = dialogIdProp || dialogs.find((d) => d.status === 'visible')?.id;
    if (dialogId) {
      hideDialog(dialogId);
      const dialog = dialogs.find((d) => d.id === dialogId);
      dialog?.responseResolver({
        status: 'hiddenByExternalCall',
        buttonId: undefined,
        textValue: undefined,
      });
      return true;
    }
    return false;
  }, [dialogs, hideDialog]);

  return (
    <DialogContext.Provider value={{
      showDialog,
      hideDialog: hideDialogExternal,
      dialogCount: dialogs.length,
    }}
    >
      { children }
      <Portal>
        { shownDialogs.map((d, i) => (
          <DialogComponent
            index={i}
            cleanUpAfterAnimations={cleanUpAfterAnimations}
            item={d}
            key={d.id}
          />
        )) }
      </Portal>
    </DialogContext.Provider>
  );
};

export function useShowDialog<TButtonId extends Id = Id>(
  defaultOpts?: DialogOptions<TButtonId>,
): ShowDialogFn<TButtonId> {
  const { showDialog } = useContext<DialogContextData<TButtonId>>(
    // eslint-disable-next-line
    // @ts-ignore
    DialogContext,
  ),
        memoizedDefaultOpts = useDeepMemo(defaultOpts),
        overrideShowDialog = useCallback((
          title: string,
          opts?: DialogOptions,
        ) => showDialog(
          title,
          { ...memoizedDefaultOpts, ...opts },
        ), [memoizedDefaultOpts, showDialog]);

  return overrideShowDialog;
}

export const useHasActiveDialog = (): boolean => {
  const { dialogCount } = useContext(DialogContext);

  return dialogCount > 0;
};

export const useShowPrompt = (defaultOpts?: DialogOptions): ShowPromptFn => {
  const { showDialog } = useContext(DialogContext),
        memoizedDefaultOpts = useDeepMemo(defaultOpts),
        overrideShowDialog = useCallback((
          title: string,
          opts?: DialogOptions,
        ) => {
          const combinedProps = { ...memoizedDefaultOpts, ...opts };
          return showDialog(
            title,
            {
              dismissable: true,
              ...combinedProps,
              inputProps: { autoFocus: true, ...combinedProps.inputProps },
            },
          );
        }, [memoizedDefaultOpts, showDialog]);
  return overrideShowDialog;
};

export const useHideDialog = (dialogId?: string): HideDialogFn => {
  const { hideDialog } = useContext(DialogContext);

  return useCallback((overrideDialogId?: string) => hideDialog(overrideDialogId || dialogId), [
    dialogId,
    hideDialog,
  ]);
};

export function useDialog<TButtonId extends Id = Id>(defaultOpts?: DialogOptions<TButtonId>): [
  ShowDialogFn<TButtonId>,
  HideDialogFn
] {
  return [
    useShowDialog(defaultOpts),
    useHideDialog(),
  ];
}


export default DialogContext;
