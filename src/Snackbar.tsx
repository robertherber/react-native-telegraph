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


type Snackbar<T extends Record<string, unknown> = Record<string, unknown>> = {
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

type SnackbarOptions<
  T extends Record<string, unknown> = Record<string, unknown>,
  TRet = unknown
> = {
  id?: string,
  timeout?: number,
  persistent?: boolean,
  actions?: Array<Action<TRet>>,
  data?: T
  onShow?: () => void,
  onHide?: () => void,
  animationDuration?: number,
  showAnimation?: Animatable.Animation,
  hideAnimation?: Animatable.Animation,
}

export type ShowSnackbarFn<
  T extends Record<string, unknown> = Record<string, unknown>,
  TRet = unknown
> = (
  title: string,
  options?: SnackbarOptions<T, TRet>
) => Promise<TRet | undefined>;

export type HideSnackbarFn = (messageId: string) => void;

export type SnackbarContextData<
  T extends Record<string, unknown> = Record<string, unknown>,
  TRet = unknown
> = {
  showSnackbar: ShowSnackbarFn<T, TRet>,
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
  wrapper: { overflow: 'hidden' },
  surface: {
    borderRadius: 5,
    margin: 5,
    marginTop: 0,
    padding: 8,
    paddingLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    elevation: 2,
    shadowOffset: { height: 2, width: 2 },
    shadowRadius: 6,
  },
  flexOne: { flex: 1 },
  reverse: { flexDirection: 'column-reverse' },
  timerWrapper: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 5,
    top: 5,
    opacity: 0.1,
    bottom: 5,
    left: 5,
    right: 5,
  },
  timer: {
    flex: 1,
    overflow: 'hidden',
    // right: 9,
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
        // animatedWidth = useRef(new Animated.Value(0)),
        [width, setWidth] = useState(0),
        onAnimationEnd = useCallback(() => {
          if (item.status === 'hidden') {
            cleanUpAfterAnimations(item.id);
          }
        }, [cleanUpAfterAnimations, item.id, item.status]),
        animation = item.status === 'hidden'
          ? item.hideAnimation || hideAnimation
          : item.showAnimation || showAnimation;

  const timer = useRef(new Animated.Value(1));

  useEffect(() => {
    if (item.timeout) {
      timer.current.setValue(1);
      const anim = Animated.timing(timer.current, {
        toValue: 0,
        useNativeDriver: true,
        duration: item.timeout,
      });
      anim.start();
      return () => anim.stop();
    }
    return () => {};
  }, [timer, item]);

  return useMemo(() => (
    <Animatable.View
      duration={item.animationDuration || animationDuration}
      delay={delay}
      useNativeDriver
      onAnimationEnd={onAnimationEnd}
      animation={animation}
    >
      <View
        style={styles.wrapper}
        onLayout={({ nativeEvent }) => {
          onHeight(nativeEvent.layout.height);
          setWidth(nativeEvent.layout.width);
        }}
      >
        <Surface style={[styles.surface, style]}>
          { children }
        </Surface>
        { item.timeout ? (
          <View style={styles.timerWrapper}>
            <Animated.View
              pointerEvents='none'
              style={[styles.timer, {
                backgroundColor: textStyle?.color || theme.colors.text,
                right: width,
                left: -width,
                width: width * 2,
                transform: [
                  { scaleX: timer.current },
                ],
              }]}
            />
          </View>
        ) : null }
      </View>
    </Animatable.View>
  ), [
    animation, animationDuration, children, delay,
    item.animationDuration, item.timeout,
    width,
    onAnimationEnd, onHeight, style, textStyle?.color, theme.colors.text,
  ]);
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
          // only animate if it's the last one
          const index = snackbars.findIndex((m) => m.id === messageId);
          let anim: Animated.CompositeAnimation | undefined;
          if (height && index === 0) {
            translateY.current.setValue(-(height + insets.bottom));
            anim = Animated.timing(translateY.current, {
              toValue: -insets.bottom,
              useNativeDriver: true,
            });
            anim.start();
          }

          setSnackbars((msgs) => msgs.filter((m) => m.id !== messageId));
          return anim;
        }, [insets.bottom, snackbars]),
        showSnackbar = useCallback(<T extends Record<string, unknown> = Record<string, unknown>, TRet = unknown>(
          title: string,
          opts?: SnackbarOptions<T, TRet>,
        ): Promise<TRet | void> => {
          const messageId = opts?.id ?? getRandomID(),
                timeout = opts?.timeout || (opts?.persistent ? undefined : defaultTimeout);

          const promise = new Promise<TRet | void>((resolve) => {
            const hideSelf = () => {
                    hideSnackbar(messageId);
                    resolve();
                  },
                  actions = opts?.actions?.map(mapActionToRawAction<TRet>(hideSelf, resolve))
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
                  resolve();
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
      bottom: current.bottom !== undefined
        ? (baseInsets.bottom || 0) + current.bottom
        : prev.bottom,
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
    const anim = Animated.timing(translateY.current, {
      toValue: -insets.bottom,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
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

  const animatedLeft = useRef(new Animated.Value(insets.left));

  useEffect(() => {
    const anim = Animated.timing(animatedLeft.current, {
      toValue: insets.left,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [insets.left]);

  return useMemo(() => (
    <SnackbarContext.Provider value={contextData as SnackbarContextData<Record<string, unknown>>}>
      { children }
      <Portal>
        <SafeAreaView pointerEvents='box-none' style={styles.flexOne}>
          <View
            pointerEvents='box-none'
            style={[styles.container, {
              right: insets.right || 0,
            }]}
          >
            <Animated.View
              style={[styles.reverse, {
                transform: [{
                  translateY: translateY.current,
                }, {
                  translateX: animatedLeft.current,
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
          </View>
        </SafeAreaView>
      </Portal>
    </SnackbarContext.Provider>
  ), [SnackbarComponent, animationDuration,
    children, cleanUpAfterAnimations, contextData, hideAnimation,
    insets.right, showAnimation, style, textStyle, visibleSnackbars]);
};

export const useShowSnackbar = <
  T extends Record<string, unknown> = Record<string, unknown>,
  TRet = unknown
>(
    defaultOpts?: SnackbarOptions<T, TRet>,
  ): ShowSnackbarFn<T, TRet> => {
  const { showSnackbar } = useContext<SnackbarContextData<T, TRet>>(
    SnackbarContext as React.Context<SnackbarContextData<T, TRet>>,
  );

  const memoizedDefaultOpts = useDeepMemo(defaultOpts);
  const overridableShowSnackbar = useCallback((
    title: string,
    opts?: SnackbarOptions<T, TRet>,
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

export const useSnackbar = <T extends Record<string, unknown> = Record<string, unknown>, TRet = unknown>(
  defaultOpts?: SnackbarOptions<T, TRet>,
): [
  ShowSnackbarFn<T, TRet>,
  HideSnackbarFn
] => [useShowSnackbar<T, TRet>(defaultOpts), useHideSnackbar()];

export default SnackbarContext;
