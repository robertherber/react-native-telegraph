
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Banner, Button, Portal, Surface, Text } from 'react-native-paper';
import { Image, SafeAreaView, StyleSheet, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { nanoid } from 'nanoid'

type Action = {
  onPress: (messageId: string) => void
  label: string
}

type Message = {
  id: string,
  title: string,
  timeout?: number,
  position: 'top' | 'bottom',
  backgroundColor?: string,
  foregroundColor?: string,
  actions: Array<Action>,
  status: 'hidden' | 'visible' | 'queued'
}

type MessageOptions = {
  id?: string,
  timeout?: number,
  position?: 'top' | 'bottom',
  backgroundColor?: string,
  foregroundColor?: string,
  actions?: Array<Action>
}

type OverlayContext = {
  visibleTopItems: Array<Message>,
  visibleBottomItems: Array<Message>,
  addMessage: (title: string, options?: MessageOptions) => string,
  hideMessage: (messageId: string) => void,
}

const OverlayContext = createContext<OverlayContext>({
  visibleTopItems: [],
  visibleBottomItems: [],
  addMessage: () => '',
  hideMessage: () => {},
})

const styles = StyleSheet.create({
  container: { left: 0, right: 0, position: 'absolute' },
  surface: { borderRadius: 5, margin: 5, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
})

type DefaultMessageComponentProps = { index: number, item: Message, deleteMessage: (itemId: string) => void };

const DefaultMessageComponent: React.FC<DefaultMessageComponentProps> = ({ item, index, deleteMessage }) => {
  const delay = index * 100,
        onAnimationEnd = () => { if(item.status === 'hidden'){
          deleteMessage(item.id)
        } },
        animation = item.status === 'hidden' ? 'fadeOutDown' : 'fadeInDown';

  return <Animatable.View 
      duration={300} 
      delay={delay} 
      useNativeDriver 
      onAnimationEnd={onAnimationEnd} 
      animation={animation}>
    <Surface key={item.id} style={styles.surface}>
      <Text style={{ flex: 1 }}>{ item.title }</Text>
    { item.actions.map((a, index) => <Button key={index} onPress={() => a.onPress(item.id)}>{ a.label }</Button>) }
  </Surface></Animatable.View>
}

type Props = {
  maxSimultaneusItems?: number,
  bottomMargin?: number,
  topMargin?: number,
  hideTopMessages?: boolean
}

export const OverlayContextProvider: React.FC<Props> = ({ children, maxSimultaneusItems = 1, bottomMargin = 85, topMargin = 0, hideTopMessages = false }) => {
  const [messages, setMessages] = useState<Message[]>([]),
        topItems = useMemo(() => messages.filter(m => m.position === 'top').slice(0, maxSimultaneusItems), [messages, maxSimultaneusItems]),
        bottomItems = useMemo(() => messages.filter(m => m.position === 'bottom').slice(0, maxSimultaneusItems), [messages, maxSimultaneusItems]),
        showTopMessages = useState(!hideTopMessages),
        hideMessage = useCallback((messageId: string) => {
          setMessages(messages => messages.map(m => m.id === messageId ? { ...m, status: 'hidden' } : m))
        }, []),
        deleteMessage = useCallback((messageId: string) => {
          setMessages(messages => messages.filter(m => m.id !== messageId))
        }, []),
        addMessage = useCallback((title: string, opts?: MessageOptions) => {
          const messageId = opts?.id || nanoid(),
                timeout = opts?.timeout,
                actions = opts?.actions || (!timeout ? [{ onPress: () => hideMessage(messageId), label: 'Hide' }] : []),
                position = opts?.position || 'bottom';
    
          setMessages(messages => {
            const status = messages.filter(m => m.position === position).length >= maxSimultaneusItems ? 'queued' : 'visible';

            if(status === 'visible' && timeout){
              setTimeout(() => {
                hideMessage(messageId);
              }, timeout)
            }

            return [...messages.filter(m => m.id !== messageId), {
              title,
              id: messageId,
              actions,
              position,
              timeout,
              status,
            }];
          })
          
          return messageId;
        }, [])

        useEffect(() => {
          const items = [...bottomItems, ...topItems].filter(i => i.status === 'queued');
          const ids = items.map(i => i.id);

          if(ids.length > 0){
            setMessages((messages) => messages.map(m => ids.includes(m.id) ? { ...m, status: 'visible' } : m ));

            items.forEach((item) => {
              if(item.timeout){
                setTimeout(() => {
                  hideMessage(item.id);
                }, item.timeout)
              }
            });
          }
        }, [bottomItems, topItems])

  return <OverlayContext.Provider value={{ 
    addMessage,
    hideMessage,
    visibleTopItems: topItems,
    visibleBottomItems: bottomItems
  }}>
    { children }
    <Portal>
        { showTopMessages ? <SafeAreaView style={[styles.container, { top: topMargin }]}>
          { topItems.map((i, index) => <DefaultMessageComponent 
            key={i.id} 
            item={i} 
            index={index} 
            deleteMessage={deleteMessage} />) }
          </SafeAreaView> : null }
        <SafeAreaView style={[styles.container, { bottom: bottomMargin, flexDirection: 'column-reverse' }]}>
          { bottomItems.map((i, index) => <DefaultMessageComponent 
              key={i.id}
              item={i} 
              index={index} 
              deleteMessage={deleteMessage}
            />) }
        </SafeAreaView>
    </Portal>
  </OverlayContext.Provider>
}

export const BannerArea: React.FC = () => {
  const { visibleTopItems } = useContext(OverlayContext);

  return <View style={{ backgroundColor: 'red', width: '100%' }}>{visibleTopItems.map(i => <Banner
    key={i.id}
    visible={i.status === 'visible'}
    actions={i.actions.map(({ label, onPress }) => ({
      label,
      onPress: () => onPress(i.id)
    }))}
    icon={({size}) => (
      <Image
        source={{
          uri: 'https://avatars3.githubusercontent.com/u/17571969?s=400&v=4',
        }}
        style={{
          width: size,
          height: size,
        }}
      />
    )}>
    { i.title }
  </Banner>) }</View>

}

export default OverlayContext;