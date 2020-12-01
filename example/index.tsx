import React from 'react';
import { Portal } from 'react-native-paper';

import SnackbarCtx, { SnackbarProvider } from './Snackbar';
import BannerCtx, { BannerProvider } from './Banner';
import DialogCtx, { DialogProvider } from './Dialog';


export const SnackbarContext = SnackbarCtx;
export const BannerContext = BannerCtx;
export const DialogContext = DialogCtx;


export * from './Banner';
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
