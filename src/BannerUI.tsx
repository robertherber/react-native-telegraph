import React, {
  useContext,
} from 'react';
import { Banner } from 'react-native-paper';
import { LayoutAnimation, SafeAreaView, StyleSheet } from 'react-native';
import * as Animatable from 'react-native-animatable';

import { BannerContext, BannerData } from './Banner';


const styles = StyleSheet.create({
  row: { flexDirection: 'row', zIndex: -1 },
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

  return (
    <SafeAreaView style={styles.row}>

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
                LayoutAnimation.easeInEaseOut();
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

    </SafeAreaView>
  );
};
