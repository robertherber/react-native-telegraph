import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { Banner } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { nanoid } from 'nanoid/non-secure';
import type { IconSource } from 'react-native-paper/lib/typescript/src/components/Icon';

import { Action } from './types';


type Message = {
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
  visibleBanners: Array<Message>,
  addBanner: (title: string, options?: BannerOptions) => string,
  removeBanner: (messageId: string) => void,
}

const BannerContext = createContext<BannerContextData>({
  visibleBanners: [],
  addBanner: () => '',
  removeBanner: () => undefined,
});

const styles = StyleSheet.create({
  maxWidth: { width: '100%' },
});

type Props = {
  maxSimultaneusItems?: number
}

export const BannerProvider: React.FC<Props> = ({ children, maxSimultaneusItems = 1 }) => {
  const [messages, setMessages] = useState<Message[]>([]),
        topItems = useMemo(
          () => messages.slice(0, maxSimultaneusItems),
          [messages, maxSimultaneusItems],
        ),
        removeBanner = useCallback((messageId: string) => {
          setMessages((msgs) => msgs.map((m) => (m.id === messageId ? { ...m, status: 'hidden' } : m)));
        }, []),
        addBanner = useCallback((title: string, opts?: BannerOptions) => {
          const messageId = opts?.id || nanoid(),
                timeout = opts?.timeout,
                actions = opts?.actions || (!timeout ? [{ onPress: () => removeBanner(messageId), label: 'Hide' }] : []);

          setMessages((msgs) => {
            const status = msgs.length >= maxSimultaneusItems ? 'queued' : 'visible';

            if (status === 'visible' && timeout) {
              setTimeout(() => {
                removeBanner(messageId);
              }, timeout);
            }

            return [...messages.filter((m) => m.id !== messageId), {
              title,
              id: messageId,
              actions,
              timeout,
              status,
            }];
          });

          return messageId;
        }, [maxSimultaneusItems, messages, removeBanner]);

  useEffect(() => {
    const items = topItems.filter((i) => i.status === 'queued');
    const ids = items.map((i) => i.id);

    if (ids.length > 0) {
      setMessages((msgs) => msgs.map((m) => (ids.includes(m.id) ? { ...m, status: 'visible' } : m)));

      items.forEach((item) => {
        if (item.timeout) {
          setTimeout(() => {
            removeBanner(item.id);
          }, item.timeout);
        }
      });
    }
  }, [topItems, removeBanner]);

  return (
    <BannerContext.Provider value={{
      addBanner,
      removeBanner,
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
    <View style={styles.maxWidth}>
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
    </View>
  );
};

export default BannerContext;
