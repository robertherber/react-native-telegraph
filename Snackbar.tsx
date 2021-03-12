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


type SnackbarPosition = 'top' | 'bottom';

type Snackbar<T = unknown> = {
  id: string,
  title: string,
  timeout?: number,
  position: SnackbarPosition,
  actions: Array<RawAction>,
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

export type ShowSnackbarFn<T = unknown> = (
  title: string,
  options?: SnackbarOptions<T>
) => Promise<T | undefined>;

export type HideSnackbarFn = (messageId: string) => void;

export type SnackbarContextData<T extends any = unknown> = {
  showSnackbar: ShowSnackbarFn<T>,
  hideSnackbar: HideSnackbarFn,
  snackbarAreaHeightTop: number,
  snackbarAreaHeightBottom: number,
}

const SnackbarContext = createContext<SnackbarContextData>({
  showSnackbar: () => Promise.resolve(undefined),
  hideSnackbar: () => undefined,
  snackbarAreaHeightTop: 0,
  snackbarAreaHeightBottom: 0,
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

export const DefaultSnackbarComponent: React.FC<SnackbarComponentProps> = ({
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
  leftMargin?: number,
  rightMargin?: number,
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
  leftMargin = 0,
  rightMargin = 0,
  SnackbarComponent = DefaultSnackbarComponent,
  defaultTimeout = 5000,
  animationDuration = 300,
  showAnimation = 'fadeInDown',
  hideAnimation = 'fadeOutDown',
}) => {
  const [snackbars, setSnackbars] = useState<Snackbar[]>([]),
        rootRef = useRef<TransitioningView>(),
        [snackbarAreaHeightTop, setSnackbarAreaHeightTop] = useState(topMargin),
        [snackbarAreaHeightBottom, setSnackbarAreaHeightBottom] = useState(bottomMargin),
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
        ): Promise<T | void> => {
          const messageId = opts?.id ?? getNanoID(),
                timeout = opts?.timeout || (opts?.persistent ? undefined : defaultTimeout),
                position = opts?.position || 'bottom';

          const promise = new Promise<T | void>((resolve) => {
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

          return promise;
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
      snackbarAreaHeightBottom,
      snackbarAreaHeightTop,
    }}
    >
      { children }
      <Portal>
        <Transitioning.View
          style={styles.flexOne}
          transition={transition}
          pointerEvents='box-none'
          // eslint-disable-next-line
          // @ts-ignore
          ref={rootRef}
        >
          <SafeAreaView
            style={[styles.container, {
              top: topMargin,
              left: leftMargin,
              right: rightMargin,
            }]}
            onLayout={({ nativeEvent }) => {
              setSnackbarAreaHeightTop(nativeEvent.layout.height);
            }}
          >
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
          <SafeAreaView
            style={[styles.container, styles.reverse, {
              bottom: bottomMargin,
              left: leftMargin,
              right: rightMargin,
            }]}
            onLayout={({ nativeEvent }) => {
              setSnackbarAreaHeightBottom(nativeEvent.layout.height);
            }}
          >
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
): ShowSnackbarFn<T> => {
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

export const useHideSnackbar = (snackbarId?: string): HideSnackbarFn => {
  const { hideSnackbar } = useContext(SnackbarContext);

  const overridableHideSnackbar = useCallback((
    overrideSnackbarId?: string,
  ) => hideSnackbar(overrideSnackbarId || snackbarId as string), [hideSnackbar, snackbarId]);

  return snackbarId
    ? overridableHideSnackbar
    : hideSnackbar;
};

export const useSnackbarAreaHeight = (position: SnackbarPosition = 'bottom'): number => {
  const { snackbarAreaHeightTop, snackbarAreaHeightBottom } = useContext(SnackbarContext);

  return position === 'bottom' ? snackbarAreaHeightBottom : snackbarAreaHeightTop;
};

export const useSnackbar = <T extends any = unknown>(
  defaultOpts?: SnackbarOptions<T>,
): [
  ShowSnackbarFn<T>,
  HideSnackbarFn
] => [useShowSnackbar<T>(defaultOpts), useHideSnackbar()];

export default SnackbarContext;
