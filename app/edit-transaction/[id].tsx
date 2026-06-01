import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AddTransactionModal from '@/components/AddTransactionModal';
import { useActivityData } from '@/app/_layout';
import { useData } from '@/context/DataContext';

export default function EditTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params?.id ? Number(params.id) : NaN;
  const { transactions, isDemoMode } = useActivityData();
  const { getTransactionById } = useData();
  const [initialTx, setInitialTx] = React.useState<any | undefined>(undefined);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      const local = !isDemoMode && Array.isArray(transactions) ? transactions : [];
      let found = local.find((t: any) => t.id === id);
      if (!found) {
        try {
          found = (await getTransactionById(id)) ?? undefined;
        } catch {}
      }
      if (mounted) setInitialTx(found ?? undefined);
    };
    if (!isNaN(id)) load();
    return () => {
      mounted = false;
    };
  }, [getTransactionById, id, isDemoMode, transactions]);

  return (
    <AddTransactionModal
      mode="edit"
      initialTransaction={initialTx}
      refreshScope="activity-summary"
      onClose={() => router.back()}
    />
  );
}
