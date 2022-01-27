# react-native-telegraph!



[![Test](https://github.com/robertherber/react-native-telegraph/actions/workflows/test.yml/badge.svg)](https://github.com/robertherber/react-native-telegraph/actions/workflows/test.yml)
[![react-native-telegraph on NPM](https://img.shields.io/npm/v/react-native-telegraph)](https://www.npmjs.com/package/react-native-telegraph)

![Example screen recording](https://user-images.githubusercontent.com/1467411/144711807-79ac658b-e4bb-4743-a2c0-0d11656dbec1.gif)

This library aims to simplify in-app message orchestration in React-Native (iOS, Android and web supported). More specifically dealing with messages that makes sense to show across views and where multiple messages could appear to the user at once. It all revolves around three main types of messages:

## Snackbars

You can choose whether you want multiple Snackbars to stack (default is showing one at a time, [as recommended](https://material.io/components/snackbars#usage)) and whether they should be persistent (default is a timeout of 5s). You can choose whether you want the Snackbars to appear on the bottom or top of the screen. You can easily override the animation with any of the ones [available here](https://github.com/oblador/react-native-animatable#animations-2), provide a custom Snackbar component to the `<SnackbarProvider />` and send custom data to your custom component.

```TypeScript
import { useSnackbar, useUpdateSnackbarInsets, useShowsnackbar } from 'react-native-telegraph';

// simply use useShowsnackbar

const showSnackbar = useShowsnackbar();

const onPressHandler = () => {
  showSnackbar('Something happened');
}

// if you want more control, there is useSnackbar
const [showSnackbar, hideSnackbar] = useSnackbar();

const onPress = useCallback(async () => {
  showSnackbar('Simple snack');
  const { buttonId, status } = await showSnackbar('Some new information is available', {
    persistent: true,
    actions: [{
      buttonId: 'reload',
      label: 'Reload'
    }, {
      buttonId: 'hide',
      label: 'Hide'
    }]
  }).response
}, [])


// Hide somewhere else in the code
const snackbarId = showSnackbar('lets hide this in another way');

// ...
hideSnackbar(snackbarId)

// control insets of the Snackbar in a specific view
useSetSnackbarInsetOffset({ bottom: 50 })
```

![Snackbar](https://callstack.github.io/react-native-paper/screenshots/snackbar.gif)

## Dialogs (based on react-native-paper)

Dialogs take up the entire focus of the user - requesting action to continue. They'll always show up one at a time - but just as with the Banners and Snackbars - if more are presented they'll show when the user has interacted with the previous ones.

```TypeScript
import { useDialog } from 'react-native-telegraph';

const [showDialog] = useDialog();

const onPress = useCallback(async () => {
  const { buttonId } = await showDialog('We need your approval to continue', {
    actions: [{
      buttonId: 'maybe-later',
      label: 'Maybe later'
    }, {
      buttonId: 'ok',
      label: 'OK'
    }]
  }).response

  console.log('You pressed button: ' + buttonId)
}, []);

```

![Dialog](https://callstack.github.io/react-native-paper/screenshots/dialog-1.png)

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

## Customizability

Theming is applied automatically through react-native-paper ([read more](https://callstack.github.io/react-native-paper/theming.html)).

[Made by Kingstinct AB](https://kingstinct.com)
