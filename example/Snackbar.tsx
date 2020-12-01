import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  Button, Portal, Surface, Text,
} from 'react-native-paper';
import { SafeAreaView, StyleSheet } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { nanoid } from 'nanoid/non-secure';

import { Action } from './types';


type Snackbar = {
  id: string,
  title: string,
  timeout?: number,
  position: 'top' | 'bottom',
  actions: Array<Action>,
  status: 'hidden' | 'visible' | 'queued',
  data?: any
}

type SnackbarOptions = {
  id?: string,
  timeout?: number,
  persistent?: boolean,
  position?: 'top' | 'bottom',
  actions?: Array<Action>,
  data?: any
}

export type SnackbarContextData = {
  showSnackbar: (title: string, options?: SnackbarOptions) => string,
  hideSnackbar: (messageId: string) => void,
}

const SnackbarContext = createContext<SnackbarContextData>({
  showSnackbar: () => '',
  hideSnackbar: () => undefined,
});

const styles = StyleSheet.create({
  container: { left: 0, right: 0, position: 'absolute' },
  surface: {
    borderRadius: 5, margin: 5, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
  },
  flexOne: { flex: 1 },
  reverse: { flexDirection: 'column-reverse' },
});

type SnackbarComponentProps = {
  index: number,
  item: Snackbar,
  cleanUpAfterAnimations: (messageId: string) => void,
  showAnimation: Animatable.Animation,
  hideAnimation: Animatable.Animation,
  animationDuration: number
};

const DefaultSnackbarComponent: React.FC<SnackbarComponentProps> = ({
  item,
  index,
  cleanUpAfterAnimations,
  showAnimation,
  hideAnimation,
  animationDuration
}) => {
  const delay = index * 100,
        onAnimationEnd = () => {
          if (item.status === 'hidden') {
            cleanUpAfterAnimations(item.id);
          }
        },
        animation = item.status === 'hidden' ? hideAnimation : showAnimation;

  return (
    <Animatable.View
      duration={animationDuration}
      delay={delay}
      useNativeDriver
      onAnimationEnd={onAnimationEnd}
      animation={animation}
    >
      <Surface key={item.id} style={styles.surface}>
        <Text style={styles.flexOne}>{ item.title }</Text>
        { item.actions.map((a) => (
          <Button
            key={`${a.label}`}
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
  SnackbarComponent?: React.FC<SnackbarComponentProps>,
  defaultTimeout?: number,
  showAnimation?: Animatable.Animation,
  hideAnimation?: Animatable.Animation,
  animationDuration?: number
}

export const SnackbarProvider: React.FC<Props> = ({
  children, 
  maxSimultaneusItems = 1, 
  bottomMargin = 0, 
  topMargin = 0, 
  SnackbarComponent = DefaultSnackbarComponent, 
  defaultTimeout = 5000, 
  animationDuration = 300, 
  showAnimation = 'fadeInDown', 
  hideAnimation = 'fadeOutDown'
}) => {
  const [snackbars, setSnackbars] = useState<Snackbar[]>([]),
        topSnackbars = useMemo(() => snackbars.filter((m) => m.position === 'top').slice(0, maxSimultaneusItems), [snackbars, maxSimultaneusItems]),
        bottomSnackbars = useMemo(() => snackbars.filter((m) => m.position === 'bottom').slice(0, maxSimultaneusItems), [snackbars, maxSimultaneusItems]),
        hideSnackbar = useCallback((messageId: string) => {
          setSnackbars((msgs) => msgs.map((m) => (m.id === messageId ? { ...m, status: 'hidden' } : m)));
        }, []),
        cleanUpAfterAnimations = useCallback((messageId: string) => {
          setSnackbars((msgs) => msgs.filter((m) => m.id !== messageId));
        }, []),
        showSnackbar = useCallback((title: string, opts?: SnackbarOptions) => {
          const messageId = opts?.id || nanoid(),
                timeout = opts?.timeout || (opts?.persistent ? undefined : defaultTimeout),
                actions = opts?.actions || (opts?.persistent ? [{ onPress: () => hideSnackbar(messageId), label: 'Hide' }] : []),
                position = opts?.position || 'bottom';

          setSnackbars((msgs) => {
            const status = msgs.filter((m) => m.position === position).length >= maxSimultaneusItems ? 'queued' : 'visible';

            if (status === 'visible' && timeout) {
              setTimeout(() => {
                hideSnackbar(messageId);
              }, timeout);
            }

            const newMessages = [...msgs.filter((m) => m.id !== messageId), {
              title,
              id: messageId,
              actions,
              position,
              timeout,
              status,
            }] as Snackbar[];

            return newMessages;
          });


          return messageId;
        }, [maxSimultaneusItems, hideSnackbar]);

  useEffect(() => {
    const items = [...bottomSnackbars, ...topSnackbars].filter((i) => i.status === 'queued');
    const ids = items.map((i) => i.id);

    if (ids.length > 0) {
      setSnackbars((msgs) => msgs.map((m) => (ids.includes(m.id) ? { ...m, status: 'visible' } : m)));

      items.forEach((item) => {
        if (item.timeout) {
          setTimeout(() => {
            hideSnackbar(item.id);
          }, item.timeout);
        }
      });
    }
  }, [bottomSnackbars, topSnackbars, hideSnackbar]);

  return (
    <SnackbarContext.Provider value={{
      showSnackbar,
      hideSnackbar,
    }}
    >
      { children }
      <Portal>
        <SafeAreaView style={[styles.container, { top: topMargin }]}>
          { topSnackbars.map((i, index) => (
            <SnackbarComponent
              key={i.id}
              item={i}
              showAnimation={showAnimation}
              hideAnimation={hideAnimation}
              animationDuration={animationDuration}
              index={index}
              cleanUpAfterAnimations={cleanUpAfterAnimations}
            />
          )) }
        </SafeAreaView>
        <SafeAreaView style={[styles.container, styles.reverse, { bottom: bottomMargin }]}>
          { bottomSnackbars.map((i, index) => (
            <SnackbarComponent
              key={i.id}
              item={i}
              showAnimation={showAnimation}
              hideAnimation={hideAnimation}
              animationDuration={animationDuration}
              index={index}
              cleanUpAfterAnimations={cleanUpAfterAnimations}
            />
          )) }
        </SafeAreaView>
      </Portal>
    </SnackbarContext.Provider>
  );
};

export const useShowSnackbar = () => {
  const { showSnackbar } = useContext(SnackbarContext);

  return showSnackbar;
}

export const useHideSnackbar = (snackbarId: string) => {
  const { hideSnackbar } = useContext(SnackbarContext);

  return snackbarId 
    ? (overrideSnackbarId?: string) => hideSnackbar(overrideSnackbarId || snackbarId) 
    : hideSnackbar;
}

export default SnackbarContext;
