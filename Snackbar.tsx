import React, {
  createContext, useCallback, useEffect, useMemo, useState,
} from 'react';
import {
  Button, Portal, Surface, Text,
} from 'react-native-paper';
import { SafeAreaView, StyleSheet } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { nanoid } from 'nanoid/non-secure';

import { Action } from './types';


type Message = {
  id: string,
  title: string,
  timeout?: number,
  position: 'top' | 'bottom',
  actions: Array<Action>,
  status: 'hidden' | 'visible' | 'queued'
}

type MessageOptions = {
  id?: string,
  timeout?: number,
  position?: 'top' | 'bottom',
  actions?: Array<Action>
}

type SnackbarContextData = {
  addMessage: (title: string, options?: MessageOptions) => string,
  removeMessage: (messageId: string) => void,
}

const SnackbarContext = createContext<SnackbarContextData>({
  addMessage: () => '',
  removeMessage: () => undefined,
});

const styles = StyleSheet.create({
  container: { left: 0, right: 0, position: 'absolute' },
  surface: {
    borderRadius: 5, margin: 5, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
  },
  flexOne: { flex: 1 },
  reverse: { flexDirection: 'column-reverse' },
});

type DefaultMessageComponentProps = {
  index: number,
  item: Message,
  deleteMessage: (itemId: string) => void
};

const DefaultMessageComponent: React.FC<DefaultMessageComponentProps> = ({
  item,
  index,
  deleteMessage,
}) => {
  const delay = index * 100,
        onAnimationEnd = () => {
          if (item.status === 'hidden') {
            deleteMessage(item.id);
          }
        },
        animation = item.status === 'hidden' ? 'fadeOutDown' : 'fadeInDown';

  return (
    <Animatable.View
      duration={300}
      delay={delay}
      useNativeDriver
      onAnimationEnd={onAnimationEnd}
      animation={animation}
    >
      <Surface key={item.id} style={styles.surface}>
        <Text style={styles.flexOne}>{ item.title }</Text>
        { item.actions.map((a) => (
          <Button
            key={a.label}
            onPress={() => a.onPress(item.id)}
          >
            { a.label }
          </Button>
        )) }
      </Surface>
    </Animatable.View>
  );
};

type Props = {
  maxSimultaneusItems?: number,
  bottomMargin?: number,
  topMargin?: number,
}

export const SnackbarProvider: React.FC<Props> = ({
  children, maxSimultaneusItems = 1, bottomMargin = 85, topMargin = 0,
}) => {
  const [messages, setMessages] = useState<Message[]>([]),
        topItems = useMemo(() => messages.filter((m) => m.position === 'top').slice(0, maxSimultaneusItems), [messages, maxSimultaneusItems]),
        bottomItems = useMemo(() => messages.filter((m) => m.position === 'bottom').slice(0, maxSimultaneusItems), [messages, maxSimultaneusItems]),
        removeMessage = useCallback((messageId: string) => {
          setMessages((msgs) => msgs.map((m) => (m.id === messageId ? { ...m, status: 'hidden' } : m)));
        }, []),
        deleteMessage = useCallback((messageId: string) => {
          setMessages((msgs) => msgs.filter((m) => m.id !== messageId));
        }, []),
        addMessage = useCallback((title: string, opts?: MessageOptions) => {
          const messageId = opts?.id || nanoid(),
                timeout = opts?.timeout,
                actions = opts?.actions || (!timeout ? [{ onPress: () => removeMessage(messageId), label: 'Hide' }] : []),
                position = opts?.position || 'bottom';

          setMessages((msgs) => {
            const status = msgs.filter((m) => m.position === position).length >= maxSimultaneusItems ? 'queued' : 'visible';

            if (status === 'visible' && timeout) {
              setTimeout(() => {
                removeMessage(messageId);
              }, timeout);
            }

            return [...messages.filter((m) => m.id !== messageId), {
              title,
              id: messageId,
              actions,
              position,
              timeout,
              status,
            }];
          });

          return messageId;
        }, [maxSimultaneusItems, messages, removeMessage]);

  useEffect(() => {
    const items = [...bottomItems, ...topItems].filter((i) => i.status === 'queued');
    const ids = items.map((i) => i.id);

    if (ids.length > 0) {
      setMessages((msgs) => msgs.map((m) => (ids.includes(m.id) ? { ...m, status: 'visible' } : m)));

      items.forEach((item) => {
        if (item.timeout) {
          setTimeout(() => {
            removeMessage(item.id);
          }, item.timeout);
        }
      });
    }
  }, [bottomItems, topItems, removeMessage]);

  return (
    <SnackbarContext.Provider value={{
      addMessage,
      removeMessage,
    }}
    >
      { children }
      <Portal>
        <SafeAreaView style={[styles.container, { top: topMargin }]}>
          { topItems.map((i, index) => (
            <DefaultMessageComponent
              key={i.id}
              item={i}
              index={index}
              deleteMessage={deleteMessage}
            />
          )) }
        </SafeAreaView>
        <SafeAreaView style={[styles.container, styles.reverse, { bottom: bottomMargin }]}>
          { bottomItems.map((i, index) => (
            <DefaultMessageComponent
              key={i.id}
              item={i}
              index={index}
              deleteMessage={deleteMessage}
            />
          )) }
        </SafeAreaView>
      </Portal>
    </SnackbarContext.Provider>
  );
};

export default SnackbarContext;
