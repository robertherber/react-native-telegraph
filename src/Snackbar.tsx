import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Button, Portal, Surface, Text, useTheme,
} from 'react-native-paper';
import {
  SafeAreaView,
  View,
  StyleSheet,
  TextStyle,
  ViewStyle,
  Animated,
} from 'react-native';
import * as Animatable from 'react-native-animatable';

import {
  Action, RawAction,
} from './types';
import {
  mapActionToRawAction, getRandomID, useDeepMemo,
} from './utils';


type Snackbar<T = unknown> = {
  id: string,
  title: string,
  timeout?: number,
  actions: Array<RawAction>,
  status: 'hidden' | 'visible' | 'queued',
  data?: T,
  onShow?: () => void,
  onHide?: () => void,
  animationDuration?: number,
  showAnimation?: Animatable.Animation,
  hideAnimation?: Animatable.Animation,
  _resolver: (value?: T) => void
}

type SnackbarOptions<T = unknown> = {
  id?: string,
  timeout?: number,
  persistent?: boolean,
  actions?: Array<Action<T>>,
  data?: T
  onShow?: () => void,
  onHide?: () => void,
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
  snackbarAreaHeight: number,
  pushInsetOffset: (insets: Partial<Insets>) => string,
  removeInsetOffset: (id: string) => void
}

const SnackbarContext = createContext<SnackbarContextData>({
  showSnackbar: () => Promise.resolve(undefined),
  hideSnackbar: () => undefined,
  snackbarAreaHeight: 0,
  pushInsetOffset: () => '',
  removeInsetOffset: () => {},
});


const styles = StyleSheet.create({
  container: {
    left: 0, right: 0, position: 'absolute', bottom: 0,
  },
  surface: {
    borderRadius: 5,
    margin: 5,
    marginTop: 0,
    padding: 8,
    paddingLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    elevation: 2,
    shadowOffset: { height: 2, width: 2 },
    shadowRadius: 6,
  },
  flexOne: { flex: 1 },
  reverse: { flexDirection: 'column-reverse' },
  timer: {
    height: StyleSheet.hairlineWidth,
    position: 'absolute',
    bottom: 5,
    left: 9,
    right: 9,
  },
});

export type SnackbarComponentProps = {
  index: number,
  item: Snackbar,
  cleanUpAfterAnimations: (messageId: string) => void,
  showAnimation: Animatable.Animation,
  hideAnimation: Animatable.Animation,
  animationDuration: number,
  style?: ViewStyle,
  textStyle?: TextStyle,
  onHeight: (height: number) => void,
};

export interface Insets {
  top: number;
  left: number;
  bottom: number;
  right: number;
}


export const DefaultSnackbarWrapper: React.FC<SnackbarComponentProps> = ({
  item,
  index,
  cleanUpAfterAnimations,
  showAnimation,
  hideAnimation,
  animationDuration,
  style,
  textStyle,
  children,
  onHeight,
}) => {
  const theme = useTheme(),
        delay = index * 100,
        onAnimationEnd = () => {
          if (item.status === 'hidden') {
            cleanUpAfterAnimations(item.id);
          }
        },
        animation = item.status === 'hidden'
          ? item.hideAnimation || hideAnimation
          : item.showAnimation || showAnimation;

  const timer = useRef(new Animated.Value(1));

  useEffect(() => {
    if (item.timeout) {
      timer.current.setValue(1);
      Animated.timing(timer.current, {
        toValue: 0,
        useNativeDriver: true,
        duration: item.timeout,
      }).start();
    }
  }, [timer, item]);

  return (
    <Animatable.View
      duration={item.animationDuration || animationDuration}
      delay={delay}
      useNativeDriver
      onAnimationEnd={onAnimationEnd}
      animation={animation}
    >
      <View onLayout={({ nativeEvent }) => onHeight(nativeEvent.layout.height)}>
        <Surface style={[styles.surface, style]}>
          { children }
        </Surface>
        { item.timeout ? (
          <Animated.View style={[styles.timer, {
            backgroundColor: textStyle?.color || theme.colors.text,
            transform: [{ scaleX: timer.current }],
          }]}
          />
        ) : null }
      </View>
    </Animatable.View>
  );
};

export const DefaultSnackbarComponent: React.FC<SnackbarComponentProps> = (props) => {
  const { textStyle, item } = props;
  return (
    <DefaultSnackbarWrapper {...props}>
      <Text style={[styles.flexOne, textStyle]}>{ item.title }</Text>
      { item.actions.map((a) => (
        <Button
          key={`${a.label}`}
          onPress={() => a.onPress(item.id)}
        >
          { a.label }
        </Button>
      )) }
    </DefaultSnackbarWrapper>
  );
};

export type SnackbarProviderProps = {
  maxSimultaneusItems?: number,
  insets? : Partial<Insets>,
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
  insets: baseInsets = {
    bottom: 0, left: 0, right: 0, top: 0,
  },
  SnackbarComponent = DefaultSnackbarComponent,
  defaultTimeout = 5000,
  animationDuration = 300,
  showAnimation = 'fadeInDown',
  hideAnimation = 'fadeOutDown',
}) => {
  const [snackbars, setSnackbars] = useState<Snackbar[]>([]),
        timeouts = useRef<Record<string, number>>({}),
        [insets, setInsets] = useState(() => ({
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
          ...baseInsets,
        })),
        [insetOffsets, setInsetOffsets] = useState<{ inset: Partial<Insets>, id: string }[]>([]),
        [snackbarAreaHeightBottom, setSnackbarAreaHeightBottom] = useState(0),
        translateY = useRef(new Animated.Value(-insets.bottom)),
        snackbarHeights = useRef<Record<string, number>>({}),
        visibleSnackbars = useMemo(() => snackbars.slice(0, maxSimultaneusItems), [
          snackbars,
          maxSimultaneusItems,
        ]),
        hideSnackbar = useCallback((messageId: string) => {
          setSnackbars((msgs) => msgs.map((m) => {
            const isSnackbarToHide = m.id === messageId;

            if (isSnackbarToHide && m.onHide) {
              m.onHide();
            }

            return isSnackbarToHide
              ? { ...m, status: 'hidden' }
              : m;
          }));
        }, []),
        cleanUpAfterAnimations = useCallback((messageId: string) => {
          const height = snackbarHeights.current[messageId];
          const index = snackbars.findIndex((m) => m.id === messageId); // only animate if it's the last one
          if (height && index === 0) {
            translateY.current.setValue(-(height + insets.bottom));
            Animated.timing(translateY.current, {
              toValue: -insets.bottom,
              useNativeDriver: true,
            }).start();
          }

          setSnackbars((msgs) => msgs.filter((m) => m.id !== messageId));
        }, [insets.bottom, snackbars]),
        showSnackbar = useCallback(<T extends any = unknown>(
          title: string,
          opts?: SnackbarOptions<T>,
        ): Promise<T | void> => {
          const messageId = opts?.id ?? getRandomID(),
                timeout = opts?.timeout || (opts?.persistent ? undefined : defaultTimeout);

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

            setSnackbars((msgs) => {
              const status = msgs.length >= maxSimultaneusItems
                ? 'queued'
                : 'visible';

              if (status === 'visible' && timeout) {
                clearTimeout(timeouts.current[messageId]);
                timeouts.current[messageId] = setTimeout(() => {
                  hideSnackbar(messageId);
                }, timeout) as unknown as number;
              }

              const newMessages = [...msgs.filter((m) => m.id !== messageId), {
                ...opts,
                _resolver: resolve,
                title,
                id: messageId,
                actions,
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
    const inset = insetOffsets.reduce<Insets>((prev, { inset: current }) => ({
      bottom: current.bottom !== undefined ? (baseInsets.bottom || 0) + current.bottom : prev.bottom,
      left: current.left !== undefined ? (baseInsets.left || 0) + current.left : prev.left,
      right: current.right !== undefined ? (baseInsets.right || 0) + current.right : prev.right,
      top: current.top !== undefined ? (baseInsets.top || 0) + current.top : prev.top,
    }), {
      bottom: baseInsets.bottom || 0,
      left: baseInsets.left || 0,
      right: baseInsets.right || 0,
      top: baseInsets.top || 0,
    });
    setInsets(inset);
  }, [
    baseInsets.bottom,
    baseInsets.top,
    baseInsets.left,
    baseInsets.right,
    insetOffsets,
  ]);

  useEffect(() => {
    Animated.timing(translateY.current, {
      toValue: -insets.bottom,
      useNativeDriver: true,
    }).start();
  }, [insets.bottom]);


  useEffect(() => {
    const wasQueued = visibleSnackbars.filter((i) => i.status === 'queued');
    const ids = wasQueued.map((i) => i.id);

    if (ids.length > 0) {
      setSnackbars((msgs) => msgs.map((m) => (ids.includes(m.id) ? { ...m, status: 'visible' } : m)));

      wasQueued.forEach((item) => {
        item.onShow?.();
        if (item.timeout) {
          clearTimeout(timeouts.current[item.id]);
          timeouts.current[item.id] = setTimeout(() => {
            hideSnackbar(item.id);
          }, item.timeout) as unknown as number;
        }
      });
    }
  }, [visibleSnackbars, hideSnackbar]);

  const pushInsetOffset = useCallback((inset: Partial<Insets>) => {
    const id = getRandomID();
    setInsetOffsets((prev) => [...prev, { id, inset }]);
    return id;
  }, []);

  const removeInsetOffset = useCallback((id) => {
    setInsetOffsets((prev) => prev.filter((offset) => offset.id !== id));
  }, []);

  const contextData = useMemo(() => ({
    showSnackbar,
    hideSnackbar,
    snackbarAreaHeight: snackbarAreaHeightBottom,
    pushInsetOffset,
    removeInsetOffset,
  }), [
    showSnackbar,
    hideSnackbar,
    snackbarAreaHeightBottom,
    pushInsetOffset,
    removeInsetOffset,
  ]);

  return (
    <SnackbarContext.Provider value={contextData}>
      { children }
      <Portal>
        <SafeAreaView pointerEvents='box-none' style={styles.flexOne}>

          <Animatable.View
            pointerEvents='box-none'
            style={[styles.container, {
              left: insets.left || 0,
              right: insets.right || 0,
            }]}
            transition={['left', 'right']}
          >
            <Animated.View
              style={[styles.reverse, {
                transform: [{
                  translateY: translateY.current,
                }],
              }]}
              onLayout={({ nativeEvent }) => {
                setSnackbarAreaHeightBottom(nativeEvent.layout.height);
              }}
            >
              { visibleSnackbars.map((i, index) => (
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
                  onHeight={(height) => {
                    snackbarHeights.current[i.id] = height;
                  }}
                />
              )) }
            </Animated.View>
          </Animatable.View>
        </SafeAreaView>
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

export const useSnackbarAreaHeight = (): number => {
  const { snackbarAreaHeight } = useContext(SnackbarContext);

  return snackbarAreaHeight;
};

export const useSetSnackbarInsetOffset = (insets: Partial<Insets>, isEnabled = true): void => {
  const { pushInsetOffset, removeInsetOffset } = useContext(SnackbarContext);

  useEffect(() => {
    if (isEnabled) {
      const id = pushInsetOffset(insets);

      return () => {
        removeInsetOffset(id);
      };
    }
    return () => {};

    // we just want to update if the insets objects properties have changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isEnabled,
    insets.bottom,
    insets.left,
    insets.right,
    insets.top,
    removeInsetOffset,
    pushInsetOffset,
  ]);
};

export const useSnackbar = <T extends any = unknown>(
  defaultOpts?: SnackbarOptions<T>,
): [
  ShowSnackbarFn<T>,
  HideSnackbarFn
] => [useShowSnackbar<T>(defaultOpts), useHideSnackbar()];

export default SnackbarContext;
