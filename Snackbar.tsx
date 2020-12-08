import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Button, Portal, Surface, Text,
} from 'react-native-paper';
import { SafeAreaView, StyleSheet } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Transition, Transitioning, TransitioningView } from 'react-native-reanimated';

import {
  Action, RawAction,
} from './types';
import {
  mapActionToRawAction, getNanoID, useDeepMemo,
} from './utils';


type Snackbar<T = unknown> = {
  id: string,
  title: string,
  timeout?: number,
  position: 'top' | 'bottom',
  actions: Array<RawAction<T>>,
  status: 'hidden' | 'visible' | 'queued',
  data?: T,
  animationDuration?: number,
  showAnimation?: Animatable.Animation,
  hideAnimation?: Animatable.Animation,
  _resolver: (value?: T) => void
}

type SnackbarOptions<T = unknown> = {
  id?: string,
  timeout?: number,
  persistent?: boolean,
  position?: 'top' | 'bottom',
  actions?: Array<Action<T>>,
  data?: T
  animationDuration?: number,
  showAnimation?: Animatable.Animation,
  hideAnimation?: Animatable.Animation,
}

export type ShowSnackbar<T = unknown> = (
  title: string,
  options?: SnackbarOptions<T>
) => [
  response: Promise<T | undefined>,
  messageId: string
]

export type SnackbarContextData<T extends any = unknown> = {
  showSnackbar: ShowSnackbar<T>,
  hideSnackbar: (messageId: string) => void,
}

const SnackbarContext = createContext<SnackbarContextData>({
  showSnackbar: () => [Promise.resolve(undefined), ''],
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

export type SnackbarComponentProps = {
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
  animationDuration,
}) => {
  const delay = index * 100,
        onAnimationEnd = () => {
          if (item.status === 'hidden') {
            cleanUpAfterAnimations(item.id);
          }
        },
        animation = item.status === 'hidden'
          ? item.hideAnimation || hideAnimation
          : item.showAnimation || showAnimation;

  return (
    <Animatable.View
      duration={item.animationDuration || animationDuration}
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

export type SnackbarProviderProps = {
  maxSimultaneusItems?: number,
  bottomMargin?: number,
  topMargin?: number,
  SnackbarComponent?: React.FC<SnackbarComponentProps>,
  defaultTimeout?: number,
  showAnimation?: Animatable.Animation,
  hideAnimation?: Animatable.Animation,
  animationDuration?: number
}

const transition = (
  <Transition.Together>
    <Transition.Change interpolation='easeInOut' />
  </Transition.Together>
);

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({
  children,
  maxSimultaneusItems = 1,
  bottomMargin = 0,
  topMargin = 0,
  SnackbarComponent = DefaultSnackbarComponent,
  defaultTimeout = 5000,
  animationDuration = 300,
  showAnimation = 'fadeInDown',
  hideAnimation = 'fadeOutDown',
}) => {
  const [snackbars, setSnackbars] = useState<Snackbar[]>([]),
        rootRef = useRef<TransitioningView>(),
        easeInOut = () => {
          rootRef.current?.animateNextTransition();
        },
        topSnackbars = useMemo(() => snackbars.filter((m) => m.position === 'top').slice(0, maxSimultaneusItems), [snackbars, maxSimultaneusItems]),
        bottomSnackbars = useMemo(() => snackbars.filter((m) => m.position === 'bottom').slice(0, maxSimultaneusItems), [snackbars, maxSimultaneusItems]),
        hideSnackbar = useCallback((messageId: string) => {
          easeInOut();
          setSnackbars((msgs) => msgs.map((m) => {
            const isSnackbar = m.id === messageId;

            return isSnackbar
              ? { ...m, status: 'hidden' }
              : m;
          }));
        }, []),
        cleanUpAfterAnimations = useCallback((messageId: string) => {
          easeInOut();
          setSnackbars((msgs) => msgs.filter((m) => m.id !== messageId));
        }, []),
        showSnackbar = useCallback(<T extends any = unknown>(
          title: string,
          opts?: SnackbarOptions<T>,
        ): [Promise<T>, string] => {
          const messageId = opts?.id || getNanoID(),
                timeout = opts?.timeout || (opts?.persistent ? undefined : defaultTimeout),
                position = opts?.position || 'bottom';

          const promise = new Promise<T>((resolve) => {
            const hideSelf = () => {
                    hideSnackbar(messageId);
                    resolve();
                  },
                  actions = opts?.actions?.map(mapActionToRawAction<T>(hideSelf, resolve))
                    || (opts?.persistent
                      ? [{ onPress: hideSelf, label: 'Hide' }]
                      : []
                    );

            easeInOut();
            setSnackbars((msgs) => {
              const status = msgs.filter(
                (m) => m.position === position,
              ).length >= maxSimultaneusItems
                ? 'queued'
                : 'visible';

              if (status === 'visible' && timeout) {
                setTimeout(() => {
                  hideSnackbar(messageId);
                }, timeout);
              }

              const newMessages = [...msgs.filter((m) => m.id !== messageId), {
                ...opts,
                _resolver: resolve,
                title,
                id: messageId,
                actions,
                position,
                timeout,
                data: opts?.data,
                status,
              }] as Snackbar[];

              return newMessages;
            });
          });


          return [promise, messageId];
        }, [maxSimultaneusItems, hideSnackbar, defaultTimeout]);

  useEffect(() => {
    const items = [...bottomSnackbars, ...topSnackbars].filter((i) => i.status === 'queued');
    const ids = items.map((i) => i.id);

    if (ids.length > 0) {
      easeInOut();
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
        <Transitioning.View
          style={{ flex: 1 }}
          transition={transition}
          pointerEvents='box-none'
          ref={rootRef}
        >
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
        </Transitioning.View>
      </Portal>
    </SnackbarContext.Provider>
  );
};

export const useShowSnackbar = <T extends any = unknown>(
  defaultOpts?: SnackbarOptions<T>,
): ShowSnackbar<T> => {
  const { showSnackbar } = useContext<SnackbarContextData<T>>(
    SnackbarContext as React.Context<SnackbarContextData<T>>,
  );

  const memoizedDefaultOpts = useDeepMemo(defaultOpts);
  const overridableShowSnackbar = useCallback((
    title: string,
    opts?: SnackbarOptions<T>,
  ) => showSnackbar(
    title,
    { ...memoizedDefaultOpts, ...opts },
  ), [showSnackbar, memoizedDefaultOpts]);

  return overridableShowSnackbar;
};

export const useHideSnackbar = (snackbarId?: string): SnackbarContextData['hideSnackbar'] => {
  const { hideSnackbar } = useContext(SnackbarContext);

  const overridableHideSnackbar = useCallback((
    overrideSnackbarId?: string,
  ) => hideSnackbar(overrideSnackbarId || snackbarId as string), [hideSnackbar, snackbarId]);

  return snackbarId
    ? overridableHideSnackbar
    : hideSnackbar;
};

export const useSnackbar = <T extends any = unknown>(
  defaultOpts?: SnackbarOptions<T>,
): [ShowSnackbar<T>, SnackbarContextData<T>['hideSnackbar']] => [useShowSnackbar<T>(defaultOpts), useHideSnackbar()];
/*
const FakeComponent = () => {
  const [showSnackbar] = useSnackbar<'hello'>({
    actions: [{
      label: 'hello',
      onPress: () => {

      },
    }, {
      label: 'hello',
      onPress: () => Promise.resolve(1),
    }],
  });
  /* const showSnackbar = useShowSnackbar<1 | 2>({
    actions: [{
      label: 'hello',
      onPress: () => Promise.resolve(2),
    }, {
      label: 'hello',
      onPress: () => Promise.resolve(1),
    }],
  });

  showSnackbar('yo', {
    actions: [{
      label: 'hide',
      onPress: 'hide',
    }, {
      label: 'yo',
      onPress: () => 2,
    }],
  });
};
*/

export default SnackbarContext;
