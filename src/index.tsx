import React from 'react';
import { Portal } from 'react-native-paper';

import { SnackbarProvider } from './Snackbar';
import { BannerProvider } from './Banner';
import { DialogProvider } from './Dialog';


export * from './ErrorBoundary';
export * from './Banner';
export * from './BannerUI';
export * from './Snackbar';
export * from './Dialog';

type Props = {
  maxSimultaneusItems?: number,
}

export const TelegraphProvider: React.FC<Props> = ({ children, maxSimultaneusItems }) => (
  <Portal.Host>
    <DialogProvider>
      <SnackbarProvider maxSimultaneusItems={maxSimultaneusItems}>
        <BannerProvider maxSimultaneusItems={maxSimultaneusItems}>
          { children }
        </BannerProvider>
      </SnackbarProvider>
    </DialogProvider>
  </Portal.Host>
);
