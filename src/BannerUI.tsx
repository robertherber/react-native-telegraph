import React, {
  useContext, useRef,
} from 'react';
import { Banner } from 'react-native-paper';
import { SafeAreaView, StyleSheet } from 'react-native';
import 'react-native-get-random-values';
import * as Animatable from 'react-native-animatable';
import { Transition, Transitioning, TransitioningView } from 'react-native-reanimated';

import { BannerContext, BannerData } from './Banner';


const styles = StyleSheet.create({
  row: { flexDirection: 'row', zIndex: -1 },
  flexOne: { flex: 1, flexDirection: 'column-reverse' },
});

export type BannerComponent = React.FC<{
  item: BannerData,
  index: number
}>

type BannerAreaProps = {
  showAnimation?: Animatable.Animation,
  hideAnimation?: Animatable.Animation,
  animationDuration?: number,
  CustomBannerComponent?: BannerComponent
}

export const BannerArea: React.FC<BannerAreaProps> = ({
  CustomBannerComponent,
  showAnimation = 'slideInDown',
  hideAnimation = 'slideOutUp',
  animationDuration = 300,
}) => {
  const { visibleBanners, deleteBanner } = useContext(BannerContext);
  const rootRef = useRef<TransitioningView>();
  const transition = (
    <Transition.Together>
      <Transition.Change durationMs={animationDuration} interpolation='easeInOut' />
    </Transition.Together>
  );

  return (
    <SafeAreaView style={styles.row}>
      <Transitioning.View
        style={styles.flexOne}
        transition={transition}
        pointerEvents='box-none'
        // eslint-disable-next-line
        // @ts-ignore
        ref={rootRef}
      >
        {visibleBanners.map((i, index) => CustomBannerComponent
          ? <CustomBannerComponent index={index} item={i} />
          : (
            <Animatable.View
              key={i.id}
              easing={i.status === 'hidden' ? 'ease-out' : 'ease-in'}
              animation={i.status === 'hidden' ? hideAnimation : showAnimation}
              duration={animationDuration}
              onAnimationEnd={() => {
                if (i.status === 'hidden') {
                  rootRef.current?.animateNextTransition();
                  deleteBanner(i.id);
                }
              }}
            >
              <Banner
                visible
                actions={i.actions.map(({ label, onPress }) => ({
                  label,
                  onPress: () => {
                    onPress(i.id);
                  },
                }))}
                icon={i.icon}
              >
                { i.title }
              </Banner>
            </Animatable.View>
          )) }
      </Transitioning.View>

    </SafeAreaView>
  );
};
