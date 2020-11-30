import React from 'react';
import { Portal } from 'react-native-paper';

import SnackbarCtx, { SnackbarProvider } from './Snackbar';
import BannerCtx, { BannerProvider } from './Banner';


export const SnackbarContext = SnackbarCtx;
export const BannerContext = BannerCtx;


export * from './Banner';
export * from './Snackbar';

export const TelegraphProvider: React.FC = ({ children }) => (
  <Portal.Host>
    <SnackbarProvider>
      <BannerProvider>
        { children }
      </BannerProvider>
    </SnackbarProvider>
  </Portal.Host>
);
