import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { Banner } from 'react-native-paper';
import { SafeAreaView, StyleSheet } from 'react-native';
import 'react-native-get-random-values';
import { nanoid } from 'nanoid';
import type { IconSource } from 'react-native-paper/lib/typescript/src/components/Icon';

import { Action } from './types';


type Banner = {
  id: string,
  title: string,
  timeout?: number,
  actions: Array<Action>,
  icon?: IconSource
  status: 'hidden' | 'visible' | 'queued'
}

type BannerOptions = {
  id?: string,
  timeout?: number,
  actions?: Array<Action>,
  icon?: IconSource
}

type BannerContextData = {
  visibleBanners: Array<Banner>,
  showBanner: (title: string, options?: BannerOptions) => string,
  hideBanner: (bannerId: string) => void,
}

const BannerContext = createContext<BannerContextData>({
  visibleBanners: [],
  showBanner: () => '',
  hideBanner: () => undefined,
});

const styles = StyleSheet.create({
  maxWidth: { width: '100%' },
});

type Props = {
  maxSimultaneusItems?: number
}

export const BannerProvider: React.FC<Props> = ({ children, maxSimultaneusItems = 1 }) => {
  const [banners, setBanners] = useState<Banner[]>([]),
        topItems = useMemo(
          () => banners.slice(0, maxSimultaneusItems + banners.filter(m => m.status === 'hidden').length),
          [banners, maxSimultaneusItems],
        ),
        deleteBanner = useCallback((bannerId: string) => {
          setBanners((msgs) => msgs.filter((m) => (m.id !== bannerId)));
        }, []),
        hideBanner = useCallback((bannerId: string) => {
          setBanners((msgs) => msgs.map((m) => (m.id === bannerId ? { ...m, status: 'hidden' } : m)));
          setTimeout(() => {
            deleteBanner(bannerId);
          }, 500)
        }, []),
        showBanner = useCallback((title: string, opts?: BannerOptions) => {
          const bannerId = opts?.id || nanoid(),
                timeout = opts?.timeout,
                hideSelf = () => hideBanner(bannerId),
                icon = opts?.icon,
                actions = opts?.actions || (!timeout ? [{ onPress: hideSelf, label: 'Hide' }] : []);

          setBanners((msgs) => {
            const status = msgs.length >= maxSimultaneusItems ? 'queued' : 'visible';

            if (status === 'visible' && timeout) {
              setTimeout(hideSelf, timeout);
            }

            return [...msgs.filter((m) => m.id !== bannerId), {
              title,
              id: bannerId,
              actions,
              timeout,
              icon,
              status,
            }];
          });

          return bannerId;
        }, [maxSimultaneusItems, hideBanner]);

  useEffect(() => {
    const items = topItems.filter((i) => i.status === 'queued');
    const ids = items.map((i) => i.id);

    if (ids.length > 0) {
      setBanners((msgs) => msgs.map((m) => (ids.includes(m.id) ? { ...m, status: 'visible' } : m)));

      items.forEach((item) => {
        if (item.timeout) {
          setTimeout(() => {
            hideBanner(item.id);
          }, item.timeout);
        }
      });
    }
  }, [topItems, hideBanner]);

  return (
    <BannerContext.Provider value={{
      showBanner,
      hideBanner,
      visibleBanners: topItems,
    }}
    >
      { children }
    </BannerContext.Provider>
  );
};

export const BannerArea: React.FC = () => {
  const { visibleBanners } = useContext(BannerContext);

  return (
    <SafeAreaView style={[styles.maxWidth, { flexDirection: 'column-reverse' }]}>
      {visibleBanners.map((i) => (
        <Banner
          key={i.id}
          visible={i.status === 'visible'}
          actions={i.actions.map(({ label, onPress }) => ({
            label,
            onPress: () => onPress(i.id),
          }))}
          icon={i.icon}
        >
          { i.title }
        </Banner>
      )) }
    </SafeAreaView>
  );
};

export const useShowBanner = () => {
  const { showBanner } = useContext(BannerContext);

  return showBanner;
}

export const useHideBanner = (bannerId?: string) => {
  const { hideBanner } = useContext(BannerContext);

  return (overrideBannerId?: string) => {
    const actualBannerId = bannerId || overrideBannerId as string;
    if(!actualBannerId){
      console.warn('No bannerId was specified to useHideBanner, nothing will happen')
    }
    return hideBanner(actualBannerId);
  }
}

export default BannerContext;
