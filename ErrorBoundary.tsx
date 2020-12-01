import React from 'react';

import { useShowDialog } from './Dialog';


type Props = {
  onError: (error: Error, errorInfo: any) => void
}

class ErrorBoundaryComponent extends React.Component<Props> {
  static getDerivedStateFromError(error: Error) {
    return {};
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const { onError } = this.props;
    // You can also log the error to an error reporting service
    console.error(error, errorInfo);
    onError(error, errorInfo);
  }

  render() {
    const { children } = this.props;
    return children;
  }
}


export const ErrorBoundaryHandler: React.FC = ({ children }) => {
  const showDialog = useShowDialog();

  return (
    <ErrorBoundaryComponent onError={(error, errorInfo) => {
      showDialog(error.message, {
        description: errorInfo.componentStack,
      });
    }}
    >
      { children }
    </ErrorBoundaryComponent>
  );
};

export default ErrorBoundaryHandler;
