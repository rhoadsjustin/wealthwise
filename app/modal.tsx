import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AddTransactionModal from '../components/AddTransactionModal';
import BottomSheet from '../components/BottomSheet';
import { selection, impactLight } from '../lib/haptics';

export default function Modal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // open on mount
    setOpen(true);
    impactLight();
  }, []);

  const handleRequestClose = () => {
    selection();
    // close sheet, then navigate back
    setOpen(false);
    setTimeout(() => router.back(), 180);
  };

  return (
    <View className="flex-1">
      <BottomSheet isOpen={open} onClose={handleRequestClose} heightRatio={0.9}>
        <AddTransactionModal onClose={handleRequestClose} />
      </BottomSheet>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}
