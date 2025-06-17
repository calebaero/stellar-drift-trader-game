import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App';

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}