'use client';

import * as React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | null>(null);

const useDialog = () => {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
};

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Dialog: React.FC<DialogProps> = ({ children, open = false, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = React.useState(open);

  const isControlled = onOpenChange !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (isControlled) {
        onOpenChange(newOpen);
      } else {
        setInternalOpen(newOpen);
      }
    },
    [isControlled, onOpenChange]
  );

  React.useEffect(() => {
    if (!isControlled) {
      setInternalOpen(open);
    }
  }, [open, isControlled]);

  const value = React.useMemo(
    () => ({
      open: isOpen,
      setOpen,
    }),
    [isOpen, setOpen]
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
};

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

const DialogTrigger: React.FC<DialogTriggerProps> = ({ children, asChild = false }) => {
  const { setOpen } = useDialog();

  if (asChild) {
    if (!React.isValidElement(children)) {
      return null;
    }

    const child = children as React.ReactElement<{ onPress?: (...args: any[]) => void }>;

    return React.cloneElement(child, {
      onPress: (...args: any[]) => {
        child.props?.onPress?.(...args);
        setOpen(true);
      },
    });
  }

  return (
    <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
};

const DialogPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

interface DialogCloseProps {
  children?: React.ReactNode;
  asChild?: boolean;
  onPress?: () => void;
}

const DialogClose: React.FC<DialogCloseProps> = ({ children, asChild = false, onPress }) => {
  const { setOpen } = useDialog();

  const handlePress = () => {
    setOpen(false);
    onPress?.();
  };

  if (asChild) {
    if (!React.isValidElement(children)) {
      return null;
    }

    const child = children as React.ReactElement<{ onPress?: (...args: any[]) => void }>;

    return React.cloneElement(child, {
      onPress: (...args: any[]) => {
        child.props?.onPress?.(...args);
        handlePress();
      },
    });
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
};

interface DialogOverlayProps {
  style?: any;
}

const DialogOverlay: React.FC<DialogOverlayProps> = ({ style }) => {
  const { setOpen } = useDialog();

  return (
    <Pressable
      style={[styles.overlay, style]}
      onPress={() => setOpen(false)}
      android_disableSound={true}
    />
  );
};

interface DialogContentProps {
  children: React.ReactNode;
  style?: any;
  showCloseButton?: boolean;
}

const DialogContent: React.FC<DialogContentProps> = ({
  children,
  style,
  showCloseButton = true,
}) => {
  const { open, setOpen } = useDialog();

  return (
    <Modal
      visible={open}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setOpen(false)}
      statusBarTranslucent={Platform.OS === 'android'}>
      <View style={styles.modalContainer}>
        <DialogOverlay />
        <View style={[styles.content, style]}>
          {showCloseButton && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setOpen(false)}
              activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
          {children}
        </View>
      </View>
    </Modal>
  );
};

interface DialogHeaderProps {
  children: React.ReactNode;
  style?: any;
}

const DialogHeader: React.FC<DialogHeaderProps> = ({ children, style }) => (
  <View style={[styles.header, style]}>{children}</View>
);

interface DialogFooterProps {
  children: React.ReactNode;
  style?: any;
}

const DialogFooter: React.FC<DialogFooterProps> = ({ children, style }) => (
  <View style={[styles.footer, style]}>{children}</View>
);

interface DialogTitleProps {
  children: React.ReactNode;
  style?: any;
}

const DialogTitle: React.FC<DialogTitleProps> = ({ children, style }) => (
  <Text style={[styles.title, style]}>{children}</Text>
);

interface DialogDescriptionProps {
  children: React.ReactNode;
  style?: any;
}

const DialogDescription: React.FC<DialogDescriptionProps> = ({ children, style }) => (
  <Text style={[styles.description, style]}>{children}</Text>
);

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    minWidth: Math.min(screenWidth - 40, 400),
    maxWidth: screenWidth - 40,
    maxHeight: screenHeight * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  footer: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
});

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
