import React from 'react';
import { ToastProvider } from './Toast';

// With react-native-toast-message, we don't need complex state management
// The library handles everything internally, so Toaster is now just a simple wrapper
export function Toaster() {
  // The ToastProvider from our Toast component already includes the Toast component
  // with our custom configuration, so we don't need to render individual toasts
  return null;
}

// Export the ToastProvider for use in the root layout
export { ToastProvider };
