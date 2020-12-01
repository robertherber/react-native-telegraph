import React, { useEffect, useState } from 'react';
import { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { useShowSnackbar } from './Snackbar';
import BannerContext, { BannerArea } from './Banner';
import { TelegraphProvider } from './index'
import { Button } from 'react-native-paper';
import { useShowDialog } from './Dialog';
import ErrorBoundaryWrapper from './ErrorBoundary';

const TelegraphDemo = () => {

  const [hey, setHey] = useState(0);
  const showSnackbar = useShowSnackbar();
  const { showBanner, hideBanner } = useContext(BannerContext);
  const showDialog = useShowDialog();
  
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
    <TelegraphProvider>     
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
