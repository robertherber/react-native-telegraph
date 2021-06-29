import React from 'react';
import { Portal } from 'react-native-paper';

import { SnackbarProvider } from './Snackbar';
import { DialogProvider } from './Dialog';


export * from './ErrorBoundary';

export * from './Snackbar';
export * from './Dialog';

type Props = {
  maxSimultaneusItems?: number,
}

export const TelegraphProvider: React.FC<Props> = ({ children, maxSimultaneusItems }) => (
  <Portal.Host>
    <DialogProvider>
      <SnackbarProvider maxSimultaneusItems={maxSimultaneusItems}>
        { children }
      </SnackbarProvider>
    </DialogProvider>
  </Portal.Host>
);
