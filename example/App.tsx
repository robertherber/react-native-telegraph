import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSnackbar, BannerArea, useBanner, TelegraphProvider, useDialog } from '../index';
import { Button, FAB } from 'react-native-paper';
import ErrorBoundaryWrapper from '../ErrorBoundary';
import { useSnackbarAreaHeight } from '../Snackbar';

const TelegraphDemo = () => {
  const [hey, setHey] = useState(0);
  const [showSnackbar, hideSnackbar] = useSnackbar<'a' | 'b'>();
  const [showBanner, hideBanner] = useBanner();
  const [showDialog] = useDialog();
  const snackbarAreaHeight = useSnackbarAreaHeight();
  
  useEffect(() => {
    showBanner('one', {
      actions: [{
        onPress: hideBanner,
        label: 'One'
      },{
        onPress: hideBanner,
        label: 'Two'
      }],
      icon: 'youtube-subscription'
    })
    showBanner('two', {
      actions: [{
        onPress: (itemId) => {
          hideBanner(itemId)
          setHey(5)
        },
        label: 'One'
      },{
        onPress: hideBanner,
        label: 'Two'
      }],
      icon: 'youtube-subscription'
    })
    showBanner('three', {
      actions: [{
        onPress: hideBanner,
        label: 'One'
      },{
        onPress: hideBanner,
        label: 'Two'
      }],
      icon: 'youtube-subscription'
    })
    /*showSnackbar('hello world with a verryrsdfgdsfgsdfg sdfg sdfg sdfg sdfg sdfg sdfg s 1', {
      actions: [{
        onPress: hideSnackbar,
        label: 'One'
      },{
        onPress: hideSnackbar,
        label: 'Two'
      }]
    })*/
    const showDialogAfterSnackbar = async () => {
      const buttonPressed = await showSnackbar('hello world 0', { persistent: true, actions: [
        { 
          label: 'button a', 
          onPress: (messageId) => {
            hideSnackbar(messageId);
            return 'a'
          } 
        },
        { 
          label: 'button b', 
          onPress: (messageId) => {
            hideSnackbar(messageId);
            return 'b'
          } 
        }
      ] })

      console.log('buttonPressed', buttonPressed);

      if(buttonPressed === 'a'){
        showDialog('hello world')
      }
    }

    void showDialogAfterSnackbar();
    
  
    showSnackbar('hello world 1', {  })
    showSnackbar('hello world 2', {  })
    showSnackbar('hello world 3', { timeout: 3000 })

  }, []);

  if(hey === 5){
    throw new Error('blaha')
  }

  return <View style={{ flex: 1 }}>
    <BannerArea />
    <Button onPress={() => {
      showDialog('hello world')
    }}>Show dialog</Button>
    <FAB icon='plus' style={{ position: 'absolute', right: 10, bottom: snackbarAreaHeight + 10 }} />
  </View>
}

export default function App() {
  return (
    <TelegraphProvider maxSimultaneusItems={2}>
      <ErrorBoundaryWrapper>
        <TelegraphDemo />
      </ErrorBoundaryWrapper>
    </TelegraphProvider>
  );
}