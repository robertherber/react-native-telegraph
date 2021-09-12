import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  BackHandler, KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  Button, Dialog, Paragraph, TextInput, useTheme,
} from 'react-native-paper';
import { TextInputProps } from 'react-native-paper/lib/typescript/components/TextInput/TextInput';

import {
  Action, RawAction,
} from './types';
import {
  getRandomID,
  mapActionToRawAction, useDeepMemo,
} from './utils';


export type DialogData<T = unknown> = {
  id: string,
  title: string,
  dismissable?: boolean,
  onDismiss?: () => void,
  description?: string,
  actions: Array<RawAction>,
  inputProps?: TextInputProps,
  status: 'hidden' | 'visible' | 'queued',
  data?: T
}

export type DialogOptions<T = unknown> = {
  id?: string,
  message?: string,
  description?: string,
  actions?: Array<Action>,
  onDismiss?: () => void,
  inputProps?: TextInputProps,
  dismissable?: boolean,
  data?: T
}

export type ShowDialogFn = (title: string, options?: DialogOptions) => string
export type ShowPromptFn = (title: string, options?: DialogOptions) => Promise<string>
export type HideDialogFn = (dialogId: string) => void;

export type DialogContextData = {
  showDialog: ShowDialogFn,
  hideDialog: HideDialogFn,
}

export const DialogContext = createContext<DialogContextData>({
  showDialog: () => '',
  hideDialog: () => undefined,
});

export type DialogContextProps = {
  index: number,
  item: DialogData,
  hideDialog: (dialogId: string) => void,
  cleanUpAfterAnimations: (dialogId: string) => void,
  onDismiss?: () => void,
};

export const DefaultDialogComponent: React.FC<DialogContextProps> = ({
  item,
  cleanUpAfterAnimations,
  hideDialog,
  onDismiss,
}) => {
  const textContentRef = useRef('');
  const modalId = 'my-id';

  useEffect(() => {
    if (item.status === 'hidden') {
      setTimeout(() => {
        cleanUpAfterAnimations(item.id);
      }, 300);
    }
  }, [item, cleanUpAfterAnimations]);

  const onDismissInternal = useCallback(() => {
    hideDialog(item.id);
    onDismiss?.();
    return true;
  }, [onDismiss, hideDialog, item.id]);

  const onChangeText = useCallback((text: string) => { textContentRef.current = text; }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && item.dismissable) {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onDismissInternal);
      return () => subscription.remove();
    }
    return () => {};
  }, [onDismissInternal]);

  console.log('item.status', item.status);

  return (

    <Dialog
      visible={item.status === 'visible'}
      onDismiss={item.dismissable ? onDismissInternal : undefined}
    >
      <KeyboardAvoidingView behavior='padding'>
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
            inputAccessoryViewID={modalId}
            {...item.inputProps}
            onChangeText={onChangeText}
            onSubmitEditing={() => {
              const action = item.actions.find((a) => !a.dismiss);
              action?.onPress(item.id, textContentRef.current);
            }}
            style={{ marginHorizontal: 10 }}
          />
        ) : null}

        <Dialog.Actions nativeID={modalId}>
          { item.actions.map((a) => (
            <Button
              key={a.label}
              onPress={() => {
                a.onPress(item.id, textContentRef.current);
              }}
            >
              {a.label}
            </Button>
          )) }
        </Dialog.Actions>
      </KeyboardAvoidingView>
    </Dialog>

  );
};

export type DialogProviderProps = {
  DialogComponent?: React.FC<DialogContextProps>,
}

export const DialogProvider: React.FC<DialogProviderProps> = ({
  children, DialogComponent = DefaultDialogComponent,
}) => {
  const [dialogs, setDialogs] = useState<DialogData[]>([]),
        shownDialogs = useMemo(() => dialogs.slice(0, 1), [dialogs]),
        hideDialog = useCallback((dialogId: string) => {
          setDialogs((msgs) => msgs.map((m) => (m.id === dialogId ? { ...m, status: 'hidden' } : m)));
        }, []),
        cleanUpAfterAnimations = useCallback((dialogId: string) => {
          setDialogs((msgs) => msgs.filter((m) => m.id !== dialogId));
        }, []),
        showDialog = useCallback((title: string, opts?: DialogOptions) => {
          const dialogId = opts?.id || getRandomID(),
                hideSelf = () => hideDialog(dialogId),
                actions = opts?.actions?.map(mapActionToRawAction(hideSelf, () => null))
                  || [{ onPress: () => hideDialog(dialogId), label: 'Ok' }];

          setDialogs((msgs) => {
            const status = msgs.length >= 1 ? 'queued' : 'visible';

            const newMessages = [...msgs.filter((m) => m.id !== dialogId), {
              ...opts,
              title,
              id: dialogId,
              actions,
              status,
            }] as DialogData[];

            return newMessages;
          });


          return dialogId;
        }, [hideDialog]);

  useEffect(() => {
    const items = shownDialogs.filter((i) => i.status === 'queued'),
          ids = items.map((i) => i.id);

    if (ids.length > 0) {
      setDialogs((msgs) => msgs.map((m) => (ids.includes(m.id) ? { ...m, status: 'visible' } : m)));
    }
  }, [shownDialogs, hideDialog]);

  console.log('dialogs', dialogs);

  return (
    <DialogContext.Provider value={{
      showDialog,
      hideDialog,
    }}
    >
      { children }
      { shownDialogs.map((d, i) => (
        <DialogComponent
          index={i}
          cleanUpAfterAnimations={cleanUpAfterAnimations}
          item={d}
          onDismiss={d.onDismiss}
          hideDialog={hideDialog}
          key={d.id}
        />
      )) }
    </DialogContext.Provider>
  );
};


export const useShowDialog = (defaultOpts?: DialogOptions): ShowDialogFn => {
  const { showDialog } = useContext(DialogContext),
        memoizedDefaultOpts = useDeepMemo(defaultOpts),
        overrideShowDialog = useCallback((
          title: string,
          opts?: DialogOptions,
        ) => showDialog(
          title,
          { ...memoizedDefaultOpts, ...opts },
        ), [memoizedDefaultOpts, showDialog]);

  return overrideShowDialog;
};

export const useShowPrompt = (defaultOpts?: DialogOptions): ShowPromptFn => {
  const { showDialog } = useContext(DialogContext),
        memoizedDefaultOpts = useDeepMemo(defaultOpts),
        theme = useTheme(),
        overrideShowDialog = useCallback((
          title: string,
          opts?: DialogOptions,
        ) => new Promise<string>((resolve, reject) => {
          const combinedProps = { ...memoizedDefaultOpts, ...opts };
          showDialog(
            title,
            {
              ...combinedProps,
              inputProps: combinedProps.inputProps || { theme },
              onDismiss: () => {
                console.log('useShowPrompt dismiss');
                reject();
                combinedProps.onDismiss?.();
              },
              actions: (combinedProps.actions ? combinedProps.actions : [{ label: 'Submit' }]).map((a) => ({
                ...a,
                onPress: (id, text) => {
                  a.onPress?.(id, text);
                  if (a.dismiss) {
                    reject();
                  } else {
                    resolve(text!);
                  }
                },
              })),
            },
          );
        }), [memoizedDefaultOpts, showDialog, theme]);

  return overrideShowDialog;
};

export const useHideDialog = (dialogId?: string): HideDialogFn => {
  const { hideDialog } = useContext(DialogContext);

  if (dialogId) {
    return (overrideDialogId?: string) => hideDialog(overrideDialogId || dialogId);
  }

  return hideDialog;
};

export const useDialog = (defaultOpts?: DialogOptions): [
  ShowDialogFn,
  HideDialogFn
] => [useShowDialog(defaultOpts), useHideDialog()];


export default DialogContext;
