# react-native-telegraph

This library aims to simplify UI handling of in-app messages. More specifically dealing with messages that makes sense to show across views and where multiple messages could appear to the user at once. It all revolves around three main types of messages:

## Snackbars

You can choose whether you want multiple Snackbars to stack (default is showing one at a time) and whether they should be persistent (default is a timeout of 5s). You can choose whether you want the Snackbars to appear on the bottom or top of the screen.

```TypeScript
import { useShowSnackbar } from 'react-native-telegraph';

const showSnackbar = useShowSnackbar();

showSnackbar('Some new information is available', { 
  persistent: true,
  actions: [{
    onPress: () => { /* reload */ },
    label: 'Reload'
  }] 
})
```

## Banners (based on react-native-paper)

You can choose whether you want multiple Banners to stack (default is showing one at a time, again). They are persistent by default. They are designed out a bit different so you'll have to choose where to place your `<BannerArea />`

```TypeScript
import { useShowBanner } from 'react-native-telegraph';

const showBanner = useShowBanner();

showBanner('Some new information is available', { 
  actions: [{
    onPress: () => { /* reload */ },
    label: 'Reload'
  }] 
})
```

## Dialogs (based on react-native-paper)

Dialogs take up the entire focus of the user - requesting action to continue. They'll always show up one at a time - but just as with the Banners and Snackbars - if more are presented they'll show when the user has interacted with the previous ones.

```TypeScript
import { useShowDialog } from 'react-native-telegraph';

const showDialog = useShowDialog();

showDialog('We need your approval to continue', { 
  actions: [{
    onPress: () => { /* do something */ },
    label: 'Maybe later'
  }, {
    onPress: () => { /* do something */ },
    label: 'OK'
  }] 
  
})
```

## Provider

The easiest way to get started is to use a single TelegraphProvider wrapping your app. For more options and flexibility you could use and configure `DialogProvider`, `SnackbarProvider` and `BannerProvider` independently.

```TypeScript
import { TelegraphProvider } from 'react-native-telegraph';


const App = ({ children }) => {
  return <TelegraphProvider>
    { children }
  </TelegraphProvider>
}
```