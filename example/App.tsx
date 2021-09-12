import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSnackbar, TelegraphProvider, useDialog, useShowPrompt } from 'react-native-telegraph';
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
        [showSnackbar, hideSnackbar] = useSnackbar<'a' | 'b'>(),
        [showDialog] = useDialog(),
        showPrompt = useShowPrompt(),
        [persistent, setPersistent] = useState(false),
        snackbarAreaHeight = useSnackbarAreaHeight(),
        [bottom, setBottom] = useState(0),
        [count, setCount] = useState(1);

  useSetSnackbarInsetOffset({ bottom }, true);
  
  useEffect(() => {
    const showDialogAfterSnackbar = async () => {
      const buttonPressed = await showSnackbar('static snackbar', { persistent: true, actions: [
        { 
          label: 'Show dialog', 
          onPress: (messageId) => {
            hideSnackbar(messageId);
            return 'a'
          } 
        },
        { 
          label: 'Hide', 
          onPress: (messageId) => {
            hideSnackbar(messageId);
            return 'b'
          } 
        }
      ] })

      console.log('buttonPressed', buttonPressed);

      if(buttonPressed === 'a'){
        showDialog('a dialog', {
          description: 'with a description',
          actions: [{
            label: 'simulate error',
            onPress: () => setHey(5)
          }]
        })
      }
    }

    void showDialogAfterSnackbar();
  }, []);

  const handlePrompt = useCallback(async () => {
    await showPrompt('A dialog', {
     message: 'Enter an email',
     dismissable: true,
     inputProps: { autoFocus: true, placeholder: 'email placeholder', keyboardType: 'email-address' },
   })
   .then((result) => alert(result))
   .catch(() => alert('dismissed!'))
   
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
        showSnackbar('snackbar ' + count, { persistent });
      }} />
    </Animatable.View>
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