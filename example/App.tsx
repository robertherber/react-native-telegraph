import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSnackbar, TelegraphProvider, useDialog, useShowPrompt, useShowDialog } from 'react-native-telegraph';
import { Button, FAB, Switch, Text } from 'react-native-paper';
import ErrorBoundaryWrapper from 'react-native-telegraph/ErrorBoundary';
import { useSnackbarAreaHeight, useSetSnackbarInsetOffset } from 'react-native-telegraph/Snackbar';
import * as Animatable from 'react-native-animatable';

const ViewWithError: React.FC<{ showError: boolean}> = ({ showError }) => {

  useEffect(() => {
    if(showError){
      throw new Error('blaha')
    }
  }, [showError])

  return null;
}

const TelegraphDemo = () => {
  const [hey, setHey] = useState(0),
        [showSnackbar, hideSnackbar] = useSnackbar<'a' | 'b'>({
          textProps: { numberOfLines: 1 },
        }),
        showDialog = useShowDialog({ maxWidth: 400 }),
        showPrompt = useShowPrompt(),
        [persistent, setPersistent] = useState(false),
        snackbarAreaHeight = useSnackbarAreaHeight(),
        [bottom, setBottom] = useState(0),
        [count, setCount] = useState(1);

  useSetSnackbarInsetOffset({ bottom }, true);
  
  useEffect(() => {
    const showDialogAfterSnackbar = async () => {
      const { response } = showSnackbar('static snackbar', { 
        persistent: true, 
        actions: [
          { 
            label: 'Show dialog', 
            buttonId: 'a'
          },
          { 
            label: 'Hide', 
            buttonId: 'b'
          }
        ] 
      })

      const { buttonId } = await response;

      console.log('buttonPressed', buttonId);

      if(buttonId === 'a'){
        const { response: res } = showDialog('a dialog', {
          description: 'with a description',
          maxWidth: 400,
          actions: [{
            label: 'simulate error',
            buttonId: 'error'
          }]
        })
        if((await res).buttonId === 'error'){
          setHey(5);
        }
      }
    }

    void showDialogAfterSnackbar();
  }, []);

  const handlePrompt = useCallback(async () => {
   const {status,buttonId, textValue} = await showPrompt('A dialog', {
     message: 'Enter an email',
     dismissable: true,
     maxWidth: 400,
     inputProps: { autoFocus: true, placeholder: 'email placeholder', keyboardType: 'email-address' },
     actions: [{ label: 'Cancel' }, { label: 'Ok' }]
   }).response;
   alert(JSON.stringify({status,buttonId, textValue}));

   
   
 }, [])

  return <View style={{ flex: 1 }}>
    <Button onPress={() => {
      showDialog('hello world')
    }}>Show dialog</Button>
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{padding: 10 }}>Persistent</Text>
      <Switch onValueChange={value => setPersistent(value)} value={persistent} />
    </View>
    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Button onPress={() => setBottom(Math.random() * 100)}>Randomize bottom inset</Button>
    </View>
    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Button onPress={handlePrompt}>Show Prompt</Button>
    </View>
    <Animatable.View style={{ position: 'absolute', right: 10, bottom: snackbarAreaHeight + 10 }} transition='bottom'>
      <ViewWithError showError={hey === 5} />
      <FAB icon='plus'  onPress={() => {
        setCount(c => c + 1);
        showSnackbar('snackbar with a hell of a lot of content snackbar with a hell of a lot of contentsnackbar with a hell of a lot of contentsnackbar with a hell of a lot of contentsnackbar with a hell of a lot of contentsnackbar with a hell of a lot of contentsnackbar with a hell of a lot of contentsnackbar with a hell of a lot of contentsnackbar with a hell of a lot of contentsnackbar with a hell of a lot of content ' + count, { persistent, actions: [{label: 'hey', buttonId: 'a'}, {label: 'yo', buttonId:'b'}] });
      }} />
    </Animatable.View>
  </View>
}

import { Provider as PaperProvider, DarkTheme  } from 'react-native-paper'

export default function App() {
  return (
    <PaperProvider theme={DarkTheme}>
    <TelegraphProvider maxSimultaneusItems={2}>
      <ErrorBoundaryWrapper>
        <TelegraphDemo />
      </ErrorBoundaryWrapper>
    </TelegraphProvider>
    </PaperProvider>
  );
}