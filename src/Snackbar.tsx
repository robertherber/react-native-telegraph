import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  Button, Portal, Surface, Text,
} from 'react-native-paper';
import {
  Insets,
  LayoutAnimation,
  View,
  SafeAreaView,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from 'react-native';
import * as Animatable from 'react-native-animatable';

import {
  Action, RawAction,
} from './types';
import {
  mapActionToRawAction, getRandomID, useDeepMemo,
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
  setSnackbarInsets: (insets: React.SetStateAction<Insets>) => void
}

const SnackbarContext = createContext<SnackbarContextData>({
  showSnackbar: () => Promise.resolve(undefined),
  hideSnackbar: () => undefined,
  snackbarAreaHeightTop: 0,
  snackbarAreaHeightBottom: 0,
  setSnackbarInsets: () => {},
});


const styles = StyleSheet.create({
  container: { left: 0, right: 0, position: 'absolute' },
  surface: {
    borderRadius: 5, margin: 5, padding: 10, paddingLeft: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
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
  animationDuration: number,
  style?: ViewStyle,
  textStyle?: TextStyle
};

export const DefaultSnackbarComponent: React.FC<SnackbarComponentProps> = ({
  item,
  index,
  cleanUpAfterAnimations,
  showAnimation,
  hideAnimation,
  animationDuration,
  style,
  textStyle,
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
      <Surface key={item.id} style={[styles.surface, style]}>
        <Text style={[styles.flexOne, textStyle]}>{ item.title }</Text>
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
  insets? : Insets,
  textStyle?: TextStyle,
  style?: ViewStyle,
  SnackbarComponent?: React.FC<SnackbarComponentProps>,
  defaultTimeout?: number,
  showAnimation?: Animatable.Animation,
  hideAnimation?: Animatable.Animation,
  animationDuration?: number
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({
  children,
  textStyle,
  style,
  maxSimultaneusItems = 1,
  insets: initialInsets = {
    bottom: 0, left: 0, right: 0, top: 0,
  },
  SnackbarComponent = DefaultSnackbarComponent,
  defaultTimeout = 5000,
  animationDuration = 300,
  showAnimation = 'fadeInDown',
  hideAnimation = 'fadeOutDown',
}) => {
  const [snackbars, setSnackbars] = useState<Snackbar[]>([]),
        [insets, setInsets] = useState(() => ({
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
          ...initialInsets,
        })),
        [snackbarAreaHeightTop, setSnackbarAreaHeightTop] = useState(insets.top || 0),
        [snackbarAreaHeightBottom, setSnackbarAreaHeightBottom] = useState(insets.bottom || 0),
        topSnackbars = useMemo(() => snackbars.filter((m) => m.position === 'top').slice(0, maxSimultaneusItems), [snackbars, maxSimultaneusItems]),
        setSnackbarInsets = useCallback((ins) => setInsets(ins), []),
        bottomSnackbars = useMemo(() => snackbars.filter((m) => m.position === 'bottom').slice(0, maxSimultaneusItems), [snackbars, maxSimultaneusItems]),
        hideSnackbar = useCallback((messageId: string) => {
          LayoutAnimation.easeInEaseOut();
          setSnackbars((msgs) => msgs.map((m) => {
            const isSnackbar = m.id === messageId;

            return isSnackbar
              ? { ...m, status: 'hidden' }
              : m;
          }));
        }, []),
        cleanUpAfterAnimations = useCallback((messageId: string) => {
          LayoutAnimation.easeInEaseOut();
          setSnackbars((msgs) => msgs.filter((m) => m.id !== messageId));
        }, []),
        showSnackbar = useCallback(<T extends any = unknown>(
          title: string,
          opts?: SnackbarOptions<T>,
        ): Promise<T | void> => {
          const messageId = opts?.id ?? getRandomID(),
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

            LayoutAnimation.easeInEaseOut();
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
    setInsets((prev) => ({
      ...prev,
      bottom: initialInsets.bottom || 0,
      top: initialInsets.top || 0,
      left: initialInsets.left || 0,
      right: initialInsets.right || 0,
    }));
  }, [initialInsets.bottom, initialInsets.top, initialInsets.left, initialInsets.right]);

  useEffect(() => {
    const items = [...bottomSnackbars, ...topSnackbars].filter((i) => i.status === 'queued');
    const ids = items.map((i) => i.id);

    if (ids.length > 0) {
      LayoutAnimation.easeInEaseOut();
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
      setSnackbarInsets,
      hideSnackbar,
      snackbarAreaHeightBottom,
      snackbarAreaHeightTop,
    }}
    >
      { children }
      <Portal>
        <View pointerEvents='box-none' style={styles.flexOne}>
          <SafeAreaView
            style={[styles.container, {
              top: insets.top || 0,
              left: insets.left || 0,
              right: insets.right || 0,
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
                style={style}
                textStyle={textStyle}
                cleanUpAfterAnimations={cleanUpAfterAnimations}
              />
            )) }
          </SafeAreaView>
          <SafeAreaView
            style={[styles.container, styles.reverse, {
              bottom: insets.bottom || 0,
              left: insets.left || 0,
              right: insets.right || 0,
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
                style={style}
                textStyle={textStyle}
                cleanUpAfterAnimations={cleanUpAfterAnimations}
              />
            )) }
          </SafeAreaView>
        </View>
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

export const useUpdateSnackbarInsets = (insets: Insets, isEnabled = true): void => {
  const { setSnackbarInsets } = useContext(SnackbarContext);

  useEffect(() => {
    if (isEnabled) {
      let prevInsets: Insets = {};

      setSnackbarInsets((previousInsets) => {
        prevInsets = previousInsets;

        const retVal = {
          ...previousInsets,
          ...insets,
        };

        return retVal;
      });

      return () => {
        setSnackbarInsets(prevInsets);
      };
    }
    return () => {};

    // we just want to update if the insets objects properties have changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, insets.bottom, insets.left, insets.right, insets.top, setSnackbarInsets]);
};

export const useSnackbar = <T extends any = unknown>(
  defaultOpts?: SnackbarOptions<T>,
): [
  ShowSnackbarFn<T>,
  HideSnackbarFn
] => [useShowSnackbar<T>(defaultOpts), useHideSnackbar()];

export default SnackbarContext;
