import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  Button, Dialog, Paragraph, Portal,
} from 'react-native-paper';
import { nanoid } from 'nanoid/non-secure';

import { Action } from './types';


type DialogData<T = unknown> = {
  id: string,
  title: string,
  dismissable?: boolean,
  description?: string,
  actions: Array<Action>,
  status: 'hidden' | 'visible' | 'queued',
  data?: T
}

type DialogOptions<T = unknown> = {
  id?: string,
  message?: string,
  description?: string,
  actions?: Array<Action>,
  dismissable?: boolean,
  data?: T
}

type DialogContextData = {
  showDialog: (title: string, options?: DialogOptions) => string,
  hideDialog: (dialogId: string) => void,
}

const DialogContext = createContext<DialogContextData>({
  showDialog: () => '',
  hideDialog: () => undefined,
});

type DialogContextProps = {
  index: number,
  item: DialogData,
  hideDialog: (dialogId: string) => void,
  cleanUpAfterAnimations: (dialogId: string) => void
};

const DefaultDialogComponent: React.FC<DialogContextProps> = ({
  item,
  cleanUpAfterAnimations,
  hideDialog,
}) => {
  useEffect(() => {
    if (item.status === 'hidden') {
      setTimeout(() => {
        cleanUpAfterAnimations(item.id);
      }, 300);
    }
  }, [item, cleanUpAfterAnimations]);

  return (
    <Dialog visible={item.status === 'visible'} onDismiss={() => hideDialog(item.id)} dismissable={item.dismissable}>
      <Dialog.Title>{ item.title }</Dialog.Title>
      { item.description
        ? (
          <Dialog.Content>
            <Paragraph>{ item.description }</Paragraph>
          </Dialog.Content>
        )
        : null }
      <Dialog.Actions>
        { item.actions.map((a) => {
          <Button onPress={() => a.onPress(item.id)}>{ a.label }</Button>;
        }) }
      </Dialog.Actions>
    </Dialog>
  );
};

type Props = {
  DialogComponent?: React.FC<DialogContextProps>,
}

export const DialogProvider: React.FC<Props> = ({
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
          const dialogId = opts?.id || nanoid(),
                actions = opts?.actions || [{ onPress: () => hideDialog(dialogId), label: 'Hide' }];

          setDialogs((msgs) => {
            const status = msgs.length >= 1 ? 'queued' : 'visible';

            const newMessages = [...msgs.filter((m) => m.id !== dialogId), {
              ...opts,
              title,
              id: dialogId,
              actions,
              dismissable: opts?.dismissable,
              description: opts?.description,
              status,
            }] as DialogData[];

            return newMessages;
          });


          return dialogId;
        }, [hideDialog]);

  useEffect(() => {
    const items = shownDialogs.filter((i) => i.status === 'queued');
    const ids = items.map((i) => i.id);

    if (ids.length > 0) {
      setDialogs((msgs) => msgs.map((m) => (ids.includes(m.id) ? { ...m, status: 'visible' } : m)));
    }
  }, [shownDialogs, hideDialog]);

  return (
    <DialogContext.Provider value={{
      showDialog,
      hideDialog,
    }}
    >
      { children }
      <Portal>
        { shownDialogs.map((d, i) => (
          <DialogComponent
            index={i}
            cleanUpAfterAnimations={cleanUpAfterAnimations}
            item={d}
            hideDialog={hideDialog}
            key={d.id}
          />
        )) }
      </Portal>
    </DialogContext.Provider>
  );
};

export const useShowDialog = (): DialogContextData['showDialog'] => {
  const { showDialog } = useContext(DialogContext);

  return showDialog;
};

export const useHideDialog = (dialogId?: string): DialogContextData['hideDialog'] => {
  const { hideDialog } = useContext(DialogContext);

  if (dialogId) {
    return (overrideDialogId?: string) => hideDialog(overrideDialogId || dialogId);
  }

  return hideDialog;
};

export default DialogContext;
