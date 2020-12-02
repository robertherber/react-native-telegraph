import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSnackbar, BannerArea, useBanner, TelegraphProvider, useDialog } from 'react-native-telegraph';
import { Button } from 'react-native-paper';
import ErrorBoundaryWrapper from 'react-native-telegraph/ErrorBoundary';

const TelegraphDemo = () => {

  const [hey, setHey] = useState(0);
  const [showSnackbar] = useSnackbar();
  const [showBanner, hideBanner] = useBanner();
  const [showDialog] = useDialog();
  
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
    showSnackbar('hello world 0', { persistent: true })
    showSnackbar('hello world 1', {  })
    showSnackbar('hello world 2', {  })
    showSnackbar('hello world 3', { timeout: 3000 })

  }, []);

  if(hey === 5){
    throw new Error('blaha')
  }

  return <View>
    <BannerArea /> 
    <Button onPress={() => {
      showDialog('hello world')
      showDialog('hello world 2')
      showDialog('hello world 3')
    }}>Testa</Button>
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


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
