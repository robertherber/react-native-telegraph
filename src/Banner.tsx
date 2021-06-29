import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';


import {
  Action, RawAction,
} from './types';
import { getNanoID, mapActionToRawAction, useDeepMemo } from './utils';


export type BannerData<T = unknown> = {
  id: string,
  title: string,
  timeout?: number,
  actions: Array<RawAction>,
  icon?: IconSource
  status: 'hidden' | 'visible' | 'queued',
  data?: T
}

export type BannerOptions<T = unknown> = {
  id?: string,
  timeout?: number,
  actions?: Array<Action>,
  icon?: IconSource,
  data?: T
}

export type BannerContextData = {
  visibleBanners: Array<BannerData>,
  showBanner: (title: string, options?: BannerOptions) => string,
  hideBanner: (bannerId: string) => void,
  deleteBanner: (bannerId: string) => void,
}

export const BannerContext = createContext<BannerContextData>({
  visibleBanners: [],
  showBanner: () => '',
  hideBanner: () => undefined,
  deleteBanner: () => undefined,
});

export type Props = {
  maxSimultaneusItems?: number,
}

export const BannerProvider: React.FC<Props> = ({ children, maxSimultaneusItems = 1 }) => {
  const [banners, setBanners] = useState<BannerData[]>([]),
        topItems = useMemo(
          () => banners.slice(0, maxSimultaneusItems),
          [banners, maxSimultaneusItems],
        ),
        deleteBanner = useCallback((bannerId: string) => {
          setBanners((msgs) => msgs.filter((m) => m.id !== bannerId));
        }, []),
        hideBanner = useCallback((bannerId: string) => {
          setBanners((msgs) => msgs.map((m) => (m.id === bannerId ? { ...m, status: 'hidden' } : m)));
        }, []),
        showBanner = useCallback((title: string, opts?: BannerOptions) => {
          const bannerId = opts?.id || getNanoID(),
                timeout = opts?.timeout,
                hideSelf = () => hideBanner(bannerId),
                icon = opts?.icon,
                actions = opts?.actions?.map(mapActionToRawAction(hideSelf, () => null)) || (!timeout ? [{ onPress: hideSelf, label: 'Hide' }] : []);

          setBanners((msgs) => {
            const status = msgs.length >= maxSimultaneusItems ? 'queued' : 'visible';

            if (status === 'visible' && timeout) {
              setTimeout(hideSelf, timeout);
            }

            return [...msgs.filter((m) => m.id !== bannerId), {
              ...opts,
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
      deleteBanner,
    }}
    >
      { children }
    </BannerContext.Provider>
  );
};


export const useShowBanner = (defaultOpts?: BannerOptions): BannerContextData['showBanner'] => {
  const { showBanner } = useContext(BannerContext);

  const memoizedDefaultOpts = useDeepMemo(defaultOpts);
  const overridableShowBanner = useCallback((
    title: string,
    opts?: BannerOptions,
  ) => showBanner(title, { ...memoizedDefaultOpts, ...opts }), [memoizedDefaultOpts, showBanner]);

  return overridableShowBanner;
};

export const useHideBanner = (bannerId?: string): BannerContextData['hideBanner'] => {
  const { hideBanner } = useContext(BannerContext);

  return (overrideBannerId?: string) => {
    const actualBannerId = bannerId || overrideBannerId as string;
    if (!actualBannerId) {
      console.warn('No bannerId was specified to useHideBanner, nothing will happen');
    }
    return hideBanner(actualBannerId);
  };
};

export const useBanner = (defaultOpts?: BannerOptions): [BannerContextData['showBanner'], BannerContextData['hideBanner']] => [useShowBanner(defaultOpts), useHideBanner()];


export default BannerContext;
