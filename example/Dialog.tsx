import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  Button, Dialog, Paragraph, Portal,
} from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { nanoid } from 'nanoid/non-secure';

import { Action } from './types';


type Dialog = {
  id: string,
  title: string,
  dismissable?: boolean,
  description?: string,
  actions: Array<Action>,
  status: 'hidden' | 'visible' | 'queued',
  data?: any
}

type DialogOptions = {
  id?: string,
  message?: string,
  description?: string,
  actions?: Array<Action>,
  dismissable?: boolean,
  data?: any
}

type DialogContextData = {
  showDialog: (title: string, options?: DialogOptions) => string,
  hideDialog: (dialogId: string) => void,
}

const DialogContext = createContext<DialogContextData>({
  showDialog: () => '',
  hideDialog: () => undefined,
});

const styles = StyleSheet.create({
  container: { left: 0, right: 0, position: 'absolute' },
  surface: {
    borderRadius: 5, margin: 5, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
  },
  flexOne: { flex: 1 }
});

type DialogContextProps = {
  index: number,
  item: Dialog,
  hideDialog: (dialogId: string) => void, 
  cleanUpAfterAnimations: (dialogId: string) => void
};

const DefaultDialogComponent: React.FC<DialogContextProps> = ({
  item,
  cleanUpAfterAnimations,
  hideDialog
}) => {
  useEffect(() =>{
    if(item.status === 'hidden'){
      setTimeout(() => {
        cleanUpAfterAnimations(item.id)
      }, 300)
    }
  }, [item, cleanUpAfterAnimations])

  return (
    <Dialog visible={item.status === 'visible'} onDismiss={() => hideDialog(item.id)} dismissable={item.dismissable}>
      <Dialog.Title>{ item.title }</Dialog.Title>
      { item.description 
        ? <Dialog.Content>
          <Paragraph>{ item.description }</Paragraph>
        </Dialog.Content> 
        : null }
      <Dialog.Actions>
        { item.actions.map(a => {
          <Button onPress={() => a.onPress(item.id)}>{ a.label }</Button>  
        }) }
      </Dialog.Actions>
    </Dialog>
  );
};

type Props = {
  DialogComponent?: React.FC<DialogContextProps>,
}

export const DialogProvider: React.FC<Props> = ({
  children, DialogComponent = DefaultDialogComponent
}) => {
  const [dialogs, setDialogs] = useState<Dialog[]>([]),
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
              title,
              id: dialogId,
              actions,
              dismissable: opts?.dismissable,
              description: opts?.description,
              status,
            }] as Dialog[];

            return newMessages;
          });


          return dialogId;
      }, [hideDialog]);

      console.log('dialogs', dialogs);

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
        { shownDialogs.map((d, i) => {
          return <DialogComponent 
            index={i} 
            cleanUpAfterAnimations={cleanUpAfterAnimations} 
            item={d} 
            hideDialog={hideDialog}
            key={d.id} />
        }) }
      </Portal>
    </DialogContext.Provider>
  );
};

export const useShowDialog = () => {
  const { showDialog } = useContext(DialogContext);

  return showDialog;
}

export const useHideDialog = (dialogId?: string) => {
  const { hideDialog } = useContext(DialogContext);

  if(dialogId){
    return (overrideDialogId?: string) => hideDialog(overrideDialogId || dialogId);
  }
  

  return hideDialog;
}

export default DialogContext;
