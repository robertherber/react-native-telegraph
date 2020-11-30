import React, { useEffect } from 'react';
import { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerArea, BannerContext, SnackbarContext, SnackbarProvider } from 'react-native-telegraph';

const TelegraphDemo = () => {
  const { addMessage, removeMessage } = useContext(SnackbarContext);
  const { addBanner, removeBanner } = useContext(BannerContext);
  
  useEffect(() => {
    addBanner('hello world with a verryrsdfgdsfgsdfg sdfg sdfg sdfg sdfg sdfg sdfg s', {
      actions: [{
        onPress: removeBanner,
        label: 'One'
      },{
        onPress: removeBanner,
        label: 'Two'
      }],
    })
    addMessage('hello world with a verryrsdfgdsfgsdfg sdfg sdfg sdfg sdfg sdfg sdfg s', {
      actions: [{
        onPress: removeMessage,
        label: 'One'
      },{
        onPress: removeMessage,
        label: 'Two'
      }]
    })
    addMessage('hello world', { position: 'top' })
    addMessage('hello world', { position: 'top', timeout: 3000 })

  }, []);

  return <View>
    <BannerArea />    
  </View>
}

export default function App() {
  return (
    <SnackbarProvider>      
      <TelegraphDemo />
    </SnackbarProvider>
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
