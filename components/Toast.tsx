import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

// Toast configuration and custom components
export interface ToastConfig {
  success: (props: any) => React.ReactElement;
  error: (props: any) => React.ReactElement;
  info: (props: any) => React.ReactElement;
  warning: (props: any) => React.ReactElement;
}

// Custom Toast Components
const SuccessToast = ({ text1, text2, onPress }: any) => (
  <View style={[styles.toastContainer, styles.successToast]}>
    <View style={styles.toastContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.toastTitle, styles.successText]}>{text1}</Text>
        {text2 && <Text style={[styles.toastDescription, styles.successDescription]}>{text2}</Text>}
      </View>
    </View>
    <TouchableOpacity onPress={onPress} style={styles.closeButton}>
      <Ionicons name="close" size={16} color="#6B7280" />
    </TouchableOpacity>
  </View>
);

const ErrorToast = ({ text1, text2, onPress }: any) => (
  <View style={[styles.toastContainer, styles.errorToast]}>
    <View style={styles.toastContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle" size={20} color="#EF4444" />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.toastTitle, styles.errorText]}>{text1}</Text>
        {text2 && <Text style={[styles.toastDescription, styles.errorDescription]}>{text2}</Text>}
      </View>
    </View>
    <TouchableOpacity onPress={onPress} style={styles.closeButton}>
      <Ionicons name="close" size={16} color="#6B7280" />
    </TouchableOpacity>
  </View>
);

const InfoToast = ({ text1, text2, onPress }: any) => (
  <View style={[styles.toastContainer, styles.infoToast]}>
    <View style={styles.toastContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="information-circle" size={20} color="#3B82F6" />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.toastTitle, styles.infoText]}>{text1}</Text>
        {text2 && <Text style={[styles.toastDescription, styles.infoDescription]}>{text2}</Text>}
      </View>
    </View>
    <TouchableOpacity onPress={onPress} style={styles.closeButton}>
      <Ionicons name="close" size={16} color="#6B7280" />
    </TouchableOpacity>
  </View>
);

const WarningToast = ({ text1, text2, onPress }: any) => (
  <View style={[styles.toastContainer, styles.warningToast]}>
    <View style={styles.toastContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="warning" size={20} color="#F59E0B" />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.toastTitle, styles.warningText]}>{text1}</Text>
        {text2 && <Text style={[styles.toastDescription, styles.warningDescription]}>{text2}</Text>}
      </View>
    </View>
    <TouchableOpacity onPress={onPress} style={styles.closeButton}>
      <Ionicons name="close" size={16} color="#6B7280" />
    </TouchableOpacity>
  </View>
);

// Toast configuration for react-native-toast-message
export const toastConfig: ToastConfig = {
  success: SuccessToast,
  error: ErrorToast,
  info: InfoToast,
  warning: WarningToast,
};

// Toast utility functions
export const showToast = {
  success: (title: string, description?: string) => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: description,
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60,
    });
  },

  error: (title: string, description?: string) => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: description,
      visibilityTime: 5000,
      autoHide: true,
      topOffset: 60,
    });
  },

  info: (title: string, description?: string) => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: description,
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60,
    });
  },

  warning: (title: string, description?: string) => {
    Toast.show({
      type: 'warning',
      text1: title,
      text2: description,
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60,
    });
  },
};

// Compatibility types for existing codebase
export interface ToastProps {
  variant?: 'default' | 'destructive';
  title: string;
  description?: string;
}

// Legacy toast function for backward compatibility
export const toast = ({ variant = 'default', title, description }: ToastProps) => {
  switch (variant) {
    case 'destructive':
      showToast.error(title, description);
      break;
    default:
      showToast.success(title, description);
      break;
  }
};

// Main Toast component (wrapper around react-native-toast-message)
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toast config={toastConfig} />
    </>
  );
};

// Export individual components for advanced usage
export { Toast as ToastMessage };

// Styles
const styles = StyleSheet.create({
  toastContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
  },
  toastContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  toastDescription: {
    fontSize: 12,
    opacity: 0.8,
  },

  // Success variant
  successToast: {
    borderLeftColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  successText: {
    color: '#065F46',
  },
  successDescription: {
    color: '#047857',
  },

  // Error variant
  errorToast: {
    borderLeftColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#991B1B',
  },
  errorDescription: {
    color: '#B91C1C',
  },

  // Info variant
  infoToast: {
    borderLeftColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  infoText: {
    color: '#1E3A8A',
  },
  infoDescription: {
    color: '#1D4ED8',
  },

  // Warning variant
  warningToast: {
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  warningText: {
    color: '#92400E',
  },
  warningDescription: {
    color: '#B45309',
  },
});

// Default export for convenience
export default {
  ToastProvider,
  showToast,
  toast,
  toastConfig,
};
