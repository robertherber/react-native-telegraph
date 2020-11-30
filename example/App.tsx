import React, { useEffect } from 'react';
import { useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Provider } from 'react-native-paper';
import OverlayContext, { OverlayContextProvider, BannerArea } from 'react-native-telegraph';

const TelegraphDemo = () => {
  const { addMessage, hideMessage } = useContext(OverlayContext)
  
  React.useEffect(() => {
    addMessage('hello world with a verryrsdfgdsfgsdfg sdfg sdfg sdfg sdfg sdfg sdfg s', {
      actions: [{
        onPress: hideMessage,
        label: 'One'
      },{
        onPress: hideMessage,
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
  useEffect(() => {

  }, [])

  return (
    <Provider>
      <OverlayContextProvider>
        <TelegraphDemo />
      </OverlayContextProvider>
    </Provider>
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
