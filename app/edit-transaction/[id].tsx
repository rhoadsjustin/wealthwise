import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AddTransactionModal from '@/components/AddTransactionModal';
import { useAppData } from '@/app/_layout';
import { useData } from '@/context/DataContext';

export default function EditTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params?.id ? Number(params.id) : NaN;
  const { transactions, refreshAppData } = useAppData();
  const { getTransactions } = useData();
  const [initialTx, setInitialTx] = React.useState<any | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      const local = Array.isArray(transactions) ? transactions : [];
      let found = local.find((t: any) => t.id === id);
      if (!found) {
        try {
          const fresh = await getTransactions();
          found = fresh.find((t: any) => t.id === id);
        } catch {}
      }
      if (mounted) setInitialTx(found || null);
    };
    if (!isNaN(id)) load();
    return () => {
      mounted = false;
    };
  }, [id, transactions, getTransactions]);

  return (
    <AddTransactionModal
      mode="edit"
      initialTransaction={initialTx}
      onClose={async () => {
        try {
          await refreshAppData();
        } catch {}
        router.back();
      }}
    />
  );
}

