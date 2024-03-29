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
  TextProps,
  Platform,
} from 'react-native';
import * as Animatable from 'react-native-animatable';

import {
  Action, Id,
} from './types';
import {
  getRandomID, useDeepMemo,
} from './utils';
import deferred from './deferred';


type Snackbar<
  TButtonId extends Id = Id,
  T extends Record<string, unknown> = Record<string, unknown>
> = {
  id: string,
  title: string,
  timeout?: number,
  actions: Array<Action<TButtonId>>,
  status: 'hidden' | 'visible' | 'queued',
  hideTimeoutTimer: boolean,
  data?: T,
  onShow?: () => void,
  onHide?: () => void,
  animationDuration?: number,
  textProps?: TextProps,
  showAnimation?: Animatable.Animation,
  hideAnimation?: Animatable.Animation,
  responseResolver: (value: SnackbarResponse) => void,
}

type SnackbarOptions<
  TButtonId extends Id = Id,
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  id?: string,
  timeout?: number,
  persistent?: boolean,
  actions?: Array<Action<TButtonId>>,
  data?: T
  onShow?: () => void,
  onHide?: () => void,
  animationDuration?: number,
  hideTimeoutTimer?: boolean,
  showAnimation?: Animatable.Animation,
  hideAnimation?: Animatable.Animation,
  textProps?: TextProps,
}

export type ShowSnackbarFn<
  TButtonId extends Id = Id,
  T extends Record<string, unknown> = Record<string, unknown>,
> = (
  title: string,
  options?: SnackbarOptions<TButtonId, T>
) => SnackbarHandle<TButtonId>;

type SnackbarResult = 'timeout' | 'buttonPressed' | 'hiddenByExternalCall';

type SnackbarResponse<TButtonId extends Id = Id> = {
  buttonId?: TButtonId,
  result: SnackbarResult,
}

type SnackbarHandle<TButtonId extends Id = Id> = {
  snackbarId: string,
  hide: () => void,
  response: Promise<SnackbarResponse<TButtonId>>,
}


export type HideSnackbarFn = (messageId: string) => void;

export type SnackbarContextData<
  TButtonId extends Id = Id,
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  showSnackbar: ShowSnackbarFn<TButtonId, T>,
  hideSnackbar: HideSnackbarFn,
  snackbarAreaHeight: number,
  pushInsetOffset: (insets: Partial<Insets>) => string,
  removeInsetOffset: (id: string) => void,
}

const SnackbarContext = createContext<SnackbarContextData>({
  showSnackbar: () => ({ snackbarId: '', hide: () => {}, response: Promise.resolve({ result: 'timeout', buttonId: '' }) }),
  hideSnackbar: () => undefined,
  snackbarAreaHeight: 0,
  pushInsetOffset: () => '',
  removeInsetOffset: () => {},
});


const styles = StyleSheet.create({
  container: {
    left: 0, right: 0, position: 'absolute', bottom: 0,
  },
  wrapper: { },
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
    top: Platform.OS === 'web' ? 5 : 0,
    opacity: 0.08,
    bottom: 5,
    left: 5,
    right: 5,
  },
  timer: {
    flex: 1,
    overflow: 'hidden',
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
  textProps?: TextProps,
  onHeight: (height: number) => void,
};

export interface Insets {
  top: number;
  left: number;
  bottom: number;
  right: number;
}


export const DefaultSnackbarWrapper: React.FC<SnackbarComponentProps> = ({
  animationDuration,
  children,
  cleanUpAfterAnimations,
  hideAnimation,
  index,
  item,
  onHeight,
  showAnimation,
  style,
  textStyle,
}) => {
  const theme = useTheme(),
        delay = index * 100,
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
      pointerEvents='box-none'
    >
      <View
        style={styles.wrapper}
        onLayout={({ nativeEvent }) => {
          onHeight(nativeEvent.layout.height);
          setWidth(nativeEvent.layout.width);
        }}
        pointerEvents='box-none'
      >
        <Surface style={[styles.surface, style]}>
          { children }
        </Surface>
        { item.timeout && !item.hideTimeoutTimer ? (
          <View pointerEvents='none' style={styles.timerWrapper}>
            <Animated.View
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
    animation, animationDuration,
    children, delay,
    item.animationDuration, item.timeout,
    width,
    item.hideTimeoutTimer,
    onAnimationEnd, onHeight,
    style, textStyle?.color, theme.colors.text,
  ]);
};

export const DefaultSnackbarComponent: React.FC<SnackbarComponentProps> = (props) => {
  const { textStyle, textProps, item } = props;
  return (
    <DefaultSnackbarWrapper {...props}>
      <Text
        style={[styles.flexOne, textStyle]}
        numberOfLines={1}
        {...textProps}
      >
        { item.title }
      </Text>
      { item.actions.map((a) => (
        <Button
          key={a.label}
          onPress={() => item.responseResolver({ result: 'buttonPressed', buttonId: a.buttonId })}
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
  hideTimeoutTimer?: boolean,
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
  hideTimeoutTimer,
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
        showSnackbar = useCallback(<
          TButtonId extends Id = Id,
          T extends Record<string, unknown> = Record<string, unknown>,
          >(
            title: string,
            opts?: SnackbarOptions<TButtonId, T>,
          ): SnackbarHandle<TButtonId> => {
          const snackbarId = opts?.id ?? getRandomID(),
                timeout = opts?.timeout || (opts?.persistent ? undefined : defaultTimeout),
                hideSelf = () => {
                  clearTimeout(timeouts.current[snackbarId]);
                  hideSnackbar(snackbarId);
                },
                actions = opts?.actions
                  || (opts?.persistent
                    ? [{ label: 'Hide' }]
                    : []
                  );

          const {
            resolve: responseResolver,
            promise: response,
          } = deferred<SnackbarResponse<TButtonId>>();

          setSnackbars((msgs) => {
            const status = msgs.length >= maxSimultaneusItems
              ? 'queued'
              : 'visible';

            if (status === 'visible' && timeout) {
              timeouts.current[snackbarId] = setTimeout(() => {
                responseResolver({ result: 'timeout' });
              }, timeout) as unknown as number;
            }

            const newMessages: Snackbar<TButtonId, T>[] = [
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              ...msgs.filter((m) => m.id !== snackbarId),
              {
                ...opts,
                hideTimeoutTimer: opts?.hideTimeoutTimer ?? hideTimeoutTimer ?? false,
                title,
                id: snackbarId,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                actions,
                timeout,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                data: opts?.data,
                status,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                responseResolver,
              }];

            return newMessages;
          });

          void response.then(hideSelf);

          const handle: SnackbarHandle<TButtonId> = {
            snackbarId,
            hide: () => responseResolver({ result: 'hiddenByExternalCall' }),
            response,
          };

          return handle;
        }, [defaultTimeout, hideSnackbar, maxSimultaneusItems, hideTimeoutTimer]);


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
            item.responseResolver({ result: 'timeout' });
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

  const hideSnackbarExternal = useCallback((snackbarId: string) => {
    const item = snackbars.find((i) => i.id === snackbarId);

    if (item) {
      item.responseResolver({ result: 'hiddenByExternalCall' });
      hideSnackbar(snackbarId);
    }
  }, [hideSnackbar, snackbars]);

  const contextData = useMemo<SnackbarContextData>(() => ({
    showSnackbar,
    hideSnackbar: hideSnackbarExternal,
    snackbarAreaHeight: snackbarAreaHeightBottom,
    pushInsetOffset,
    removeInsetOffset,
  }), [
    showSnackbar,
    snackbarAreaHeightBottom,
    pushInsetOffset,
    removeInsetOffset,
    hideSnackbarExternal,
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
    <SnackbarContext.Provider value={contextData}>
      { children }
      <Portal>
        <SafeAreaView pointerEvents='box-none' style={styles.flexOne}>
          <View
            pointerEvents='box-none'
            style={[styles.container, {
              right: insets.right + insets.left,
            }]}
          >
            <Animated.View
              pointerEvents='box-none'
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
                  textProps={i.textProps}
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
  ), [
    animationDuration,
    children,
    cleanUpAfterAnimations,
    contextData,
    hideAnimation,
    insets.left,
    insets.right,
    showAnimation,
    SnackbarComponent,
    style,
    textStyle,
    visibleSnackbars,
  ]);
};

export const useShowSnackbar = <
  TButtonId extends Id = Id,
  T extends Record<string, unknown> = Record<string, unknown>,
>(
    defaultOpts?: SnackbarOptions<TButtonId, T>,
  ): ShowSnackbarFn<TButtonId, T> => {
  const { showSnackbar } = useContext<SnackbarContextData<TButtonId, T>>(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    SnackbarContext,
  );

  const memoizedDefaultOpts = useDeepMemo(defaultOpts);
  const overridableShowSnackbar = useCallback((
    title: string,
    opts?: SnackbarOptions<TButtonId, T>,
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
      const id = pushInsetOffset({
        bottom: insets.bottom,
        left: insets.left,
        right: insets.right,
        top: insets.top,
      });

      return () => {
        removeInsetOffset(id);
      };
    }
    return () => {};
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

export const useSnackbar = <
  TButtonId extends Id = Id,
  T extends Record<string, unknown> = Record<string, unknown>
>(
    defaultOpts?: SnackbarOptions<TButtonId, T>,
  ): [
  ShowSnackbarFn<TButtonId, T>,
  HideSnackbarFn
] => [useShowSnackbar<TButtonId, T>(defaultOpts), useHideSnackbar()];

export default SnackbarContext;
