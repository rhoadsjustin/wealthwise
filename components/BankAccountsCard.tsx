import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import ConnectBankModal from './ConnectBankModal';
import { useData } from '../context/DataContext';

interface BankAccount {
  id: number;
  institutionName: string;
  accountName: string;
  accountType: string;
  mask: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
}

export default function BankAccountsCard() {
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { getBankAccounts } = useData();

  // Load bank accounts on component mount
  useEffect(() => {
    const loadBankAccounts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const accounts = await getBankAccounts();
        setBankAccounts(accounts);
      } catch (err) {
        console.error('Failed to load bank accounts:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    loadBankAccounts();
  }, [getBankAccounts]);

  const getAccountIcon = (accountType: string) => {
    switch (accountType.toLowerCase()) {
      case 'checking':
        return <MaterialIcons name="account-balance-wallet" size={16} color="#3B82F6" />;
      case 'savings':
        return <MaterialIcons name="savings" size={16} color="#10B981" />;
      case 'credit':
        return <MaterialIcons name="credit-card" size={16} color="#EF4444" />;
      case 'investment':
        return <MaterialIcons name="trending-up" size={16} color="#8B5CF6" />;
      case 'loan':
        return <FontAwesome5 name="hand-holding-usd" size={16} color="#F59E0B" />;
      default:
        return <MaterialIcons name="account-balance" size={16} color="#6B7280" />;
    }
  };

  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return 'Not synced';
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just synced';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const handleRefreshAccount = async (accountId: number) => {
    // In this local-only mode, no sync operations are performed
    // For now, just reload the accounts
    try {
      const accounts = await getBankAccounts();
      setBankAccounts(accounts);
    } catch (err) {
      console.error('Failed to refresh bank accounts:', err);
    }
  };

  if (isLoading) {
    return (
      <Card className="card-mobile">
        <CardContent className="p-4">
          <View className="mb-4 flex-row items-center gap-2">
            <MaterialIcons name="account-balance" size={20} color="#111827" />
            <Text className="text-lg font-semibold text-gray-900">Bank Accounts</Text>
          </View>
          <View className="space-y-3">
            <View className="h-12 rounded bg-gray-200" />
            <View className="h-12 rounded bg-gray-200" />
          </View>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card-mobile">
        <CardContent className="p-4">
          <View className="mb-4 flex-row items-center gap-2">
            <MaterialIcons name="account-balance" size={20} color="#111827" />
            <Text className="text-lg font-semibold text-gray-900">Bank Accounts</Text>
          </View>
          <View className="items-center py-4">
            <Text className="mb-3 text-center text-sm text-gray-600">
              Bank services temporarily unavailable
            </Text>
            <Button onPress={() => setIsBankModalOpen(true)} variant="outline" size="sm">
              Try Again
            </Button>
          </View>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="card-mobile">
        <CardContent className="p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="account-balance" size={20} color="#111827" />
              <Text className="text-lg font-semibold text-gray-900">Bank Accounts</Text>
            </View>
            <Button
              size="sm"
              variant="outline"
              onPress={() => setIsBankModalOpen(true)}
              className="h-8 px-3">
              <View className="flex-row items-center">
                <MaterialIcons name="add" size={16} color="#374151" />
                <Text className="ml-1 text-sm font-medium text-gray-700">Connect</Text>
              </View>
            </Button>
          </View>

          <View className="space-y-3">
            {bankAccounts.length === 0 ? (
              <View className="items-center py-6">
                <MaterialIcons name="account-balance" size={48} color="#9CA3AF" />
                <Text className="mb-2 mt-3 text-center font-medium text-gray-600">
                  No banks connected
                </Text>
                <Text className="mb-4 px-4 text-center text-sm text-gray-500">
                  Connect your bank to automatically import transactions
                </Text>
                <Button onPress={() => setIsBankModalOpen(true)} className="w-full">
                  <View className="flex-row items-center">
                    <MaterialIcons name="account-balance" size={16} color="#FFFFFF" />
                    <Text className="ml-2 font-medium text-white">Connect Bank Account</Text>
                  </View>
                </Button>
              </View>
            ) : (
              bankAccounts.map((account: BankAccount) => (
                <View
                  key={account.id}
                  className="flex-row items-center justify-between rounded-lg border border-gray-200 p-3">
                  <View className="flex-1 flex-row items-center gap-3">
                    {getAccountIcon(account.accountType)}
                    <View className="min-w-0 flex-1">
                      <Text className="font-medium text-gray-900" numberOfLines={1}>
                        {account.accountName} {account.mask && `••••${account.mask}`}
                      </Text>
                      <View className="mt-1 flex-row items-center gap-2">
                        <Text className="flex-shrink text-sm text-gray-600" numberOfLines={1}>
                          {account.institutionName}
                        </Text>
                        <Badge
                          variant={account.isActive ? 'default' : 'secondary'}
                          className="text-xs">
                          {account.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </View>
                      <Text className="mt-1 text-xs text-gray-500">
                        {formatLastSync(account.lastSyncAt)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRefreshAccount(account.id)}
                    className="h-8 w-8 items-center justify-center rounded"
                    activeOpacity={0.7}>
                    <MaterialIcons name="refresh" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </CardContent>
      </Card>

      <ConnectBankModal isOpen={isBankModalOpen} onClose={() => setIsBankModalOpen(false)} />
    </>
  );
}
