# react-native-telegraph

This library aims to simplify in-app message orchestration in React-Native (iOS, Android and web supported). More specifically dealing with messages that makes sense to show across views and where multiple messages could appear to the user at once. It all revolves around three main types of messages:

## Snackbars

You can choose whether you want multiple Snackbars to stack (default is showing one at a time, [as recommended](https://material.io/components/snackbars#usage)) and whether they should be persistent (default is a timeout of 5s). You can choose whether you want the Snackbars to appear on the bottom or top of the screen. You can easily override the animation with any of the ones [available here](https://github.com/oblador/react-native-animatable#animations-2), provide a custom Snackbar component to the `<SnackbarProvider />` and send custom data to your custom component.

```TypeScript
import { useSnackbar } from 'react-native-telegraph';

const [showSnackbar, hideSnackbar] = useSnackbar();

showSnackbar('Simple banner');
showSnackbar('Some new information is available', {
  persistent: true,
  actions: [{
    onPress: () => { /* reload */ },
    label: 'Reload'
  }, {
    onPress: 'hide',
    label: 'Hide'
  }]
})

// Hide somewhere else in the code
const snackbarId = showSnackbar('lets hide this in another way');

// ...
hideSnackbar(snackbarId)
```

![Snackbar](https://callstack.github.io/react-native-paper/screenshots/snackbar.gif)

## Banners (based on react-native-paper)

You can choose whether you want multiple Banners to stack (default is showing one at a time, again [as recommended](https://material.io/components/banners#usage). They are persistent by default. They are designed out a bit different so you'll have to choose where to place your `<BannerArea />`

```TypeScript
import { useBanner } from 'react-native-telegraph';

const [showBanner] = useBanner();

showBanner('Simple banner');
showBanner('Some new information is available', {
  actions: [{
    onPress: () => { /* reload */ },
    label: 'Reload'
  }]
})

// somewhere in your View Hierarchy (under the same Provider)
<BannerArea />

```

![Banner](https://callstack.github.io/react-native-paper/screenshots/banner.gif)

## Dialogs (based on react-native-paper)

Dialogs take up the entire focus of the user - requesting action to continue. They'll always show up one at a time - but just as with the Banners and Snackbars - if more are presented they'll show when the user has interacted with the previous ones.

```TypeScript
import { useDialog } from 'react-native-telegraph';

const [showDialog] = useDialog();

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
