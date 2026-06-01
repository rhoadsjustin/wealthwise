import React from 'react';
import { useRouter } from 'expo-router';
import AddTransactionModal from '@/components/AddTransactionModal';

export default function AddTransactionScreen() {
  const router = useRouter();
  return <AddTransactionModal onClose={() => router.back()} />;
}
