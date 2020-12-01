import React from 'react';
import { useShowDialog } from './Dialog';

export const ErrorBoundaryHandler: React.FC = ({ children }) => {
  const showDialog = useShowDialog()

  return <ErrorBoundaryComponent onError={(error, errorInfo) => {
    showDialog(error.message, {
      description: errorInfo.componentStack,
    })
  }}>{ children }</ErrorBoundaryComponent>
}

type Props = {
  onError: (error: Error, errorInfo: any) => void
}

class ErrorBoundaryComponent extends React.Component<Props> {

  static getDerivedStateFromError(error: Error){
    return {};
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // You can also log the error to an error reporting service
    console.error(error, errorInfo);
    this.props.onError(error, errorInfo);
  }

  render() {
    return this.props.children; 
  }
}

export default ErrorBoundaryHandler;