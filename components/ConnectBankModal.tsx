import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './Dialog';
import { Button } from './Button';
import { Card, CardContent } from './Card';
import { Badge } from './Badge';
import { useToast } from '../context/useToast';
import { useData } from '../context/DataContext';
import type { BankAccount } from '../context/DataContext';

interface ConnectBankModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DemoBank {
  id: string;
  name: string;
  logo: string;
  color: string;
  accounts: {
    name: string;
    type: string;
    subtype?: string;
    mask: string;
  }[];
}

const DEMO_BANKS: DemoBank[] = [
  {
    id: 'chase',
    name: 'Chase Bank',
    logo: '🏦',
    color: '#0066B2',
    accounts: [
      { name: 'Chase Total Checking', type: 'checking', mask: '1234' },
      { name: 'Chase Savings', type: 'savings', mask: '5678' },
    ],
  },
  {
    id: 'wells_fargo',
    name: 'Wells Fargo',
    logo: '🏛️',
    color: '#D71921',
    accounts: [
      { name: 'Everyday Checking', type: 'checking', mask: '9012' },
      { name: 'Way2Save Savings', type: 'savings', mask: '3456' },
    ],
  },
  {
    id: 'bank_of_america',
    name: 'Bank of America',
    logo: '🏪',
    color: '#E31837',
    accounts: [
      { name: 'Advantage Plus Banking', type: 'checking', mask: '7890' },
      { name: 'Advantage Savings', type: 'savings', mask: '2468' },
    ],
  },
  {
    id: 'citi',
    name: 'Citibank',
    logo: '🏢',
    color: '#056DAE',
    accounts: [
      { name: 'Basic Banking Package', type: 'checking', mask: '1357' },
      { name: 'Accelerate Savings', type: 'savings', mask: '9753' },
    ],
  },
  {
    id: 'amex',
    name: 'American Express',
    logo: '💳',
    color: '#006FCF',
    accounts: [
      { name: 'Blue Cash Preferred', type: 'credit', subtype: 'credit card', mask: '8642' },
      { name: 'Gold Card', type: 'credit', subtype: 'credit card', mask: '1975' },
    ],
  },
  {
    id: 'capital_one',
    name: 'Capital One',
    logo: '🏦',
    color: '#004879',
    accounts: [
      { name: '360 Checking', type: 'checking', mask: '3691' },
      { name: 'Venture Rewards', type: 'credit', subtype: 'credit card', mask: '2580' },
    ],
  },
];

export default function ConnectBankModal({ isOpen, onClose }: ConnectBankModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedBank, setSelectedBank] = useState<DemoBank | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [step, setStep] = useState<'banks' | 'accounts' | 'connecting'>('banks');

  const { toast } = useToast();
  const { getBankAccounts, createBankAccount } = useData();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Load bank accounts on component mount
  useEffect(() => {
    const loadBankAccounts = async () => {
      setAccountsLoading(true);
      try {
        const accounts = await getBankAccounts();
        setBankAccounts(accounts);
      } catch (error) {
        console.error('Failed to load bank accounts:', error);
      } finally {
        setAccountsLoading(false);
      }
    };
    loadBankAccounts();
  }, [getBankAccounts]);

  const getAccountIcon = (accountType: string) => {
    switch (accountType.toLowerCase()) {
      case 'checking':
        return <MaterialIcons name="account-balance-wallet" size={20} color="#3B82F6" />;
      case 'savings':
        return <MaterialIcons name="savings" size={20} color="#10B981" />;
      case 'credit':
        return <MaterialIcons name="credit-card" size={20} color="#EF4444" />;
      default:
        return <MaterialIcons name="account-balance" size={20} color="#6B7280" />;
    }
  };

  const formatLastSync = (lastSyncAt?: string | null) => {
    if (!lastSyncAt) return 'Never synced';
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just synced';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const handleBankSelect = (bank: DemoBank) => {
    setSelectedBank(bank);
    setSelectedAccounts([]);
    setStep('accounts');
  };

  const handleAccountToggle = (accountIndex: number) => {
    const accountKey = `${selectedBank?.id}_${accountIndex}`;
    setSelectedAccounts((prev) =>
      prev.includes(accountKey) ? prev.filter((id) => id !== accountKey) : [...prev, accountKey]
    );
  };

  const handleConnect = async () => {
    if (!selectedBank || selectedAccounts.length === 0) return;

    setStep('connecting');
    setIsConnecting(true);

    try {
      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create bank accounts for selected accounts
      for (const accountKey of selectedAccounts) {
        const accountIndex = parseInt(accountKey.split('_')[1]);
        const account = selectedBank.accounts[accountIndex];

        const bankAccountData = {
          institutionId: selectedBank.id,
          institutionName: selectedBank.name,
          accountId: `acc_${selectedBank.id}_${accountIndex}`,
          accountName: account.name,
          accountType: account.type,
          accountSubtype: account.subtype || account.type,
          mask: account.mask,
          isActive: true,
          lastSyncAt: new Date().toISOString(),
          accessToken: `demo_token_${selectedBank.id}_${accountIndex}`,
        };

        await createBankAccount(bankAccountData);
      }

      toast({
        title: 'Bank accounts connected!',
        description: `Successfully connected ${selectedAccounts.length} account(s) from ${selectedBank.name}.`,
        variant: 'default',
      });

      // Reset state and close modal
      resetState();
      onClose();
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: 'Connection failed',
        description: "We couldn't connect your bank accounts. Please try again.",
        variant: 'destructive',
      });
      setStep('accounts');
    } finally {
      setIsConnecting(false);
    }
  };

  const resetState = () => {
    setSelectedBank(null);
    setSelectedAccounts([]);
    setStep('banks');
    setIsConnecting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (accountsLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent style={{ maxWidth: 400 }}>
          <DialogHeader>
            <DialogTitle>
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="account-balance" size={20} color="#111827" />
                <Text>Connect Bank Account</Text>
              </View>
            </DialogTitle>
          </DialogHeader>
          <View className="items-center justify-center py-8">
            <ActivityIndicator size="large" color="#6B7280" />
          </View>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent style={{ maxHeight: '85vh', maxWidth: 600 }}>
        <DialogHeader>
          <DialogTitle>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="account-balance" size={20} color="#111827" />
              <Text>Bank Account Integration</Text>
            </View>
          </DialogTitle>
          {step === 'banks' && (
            <DialogDescription>
              Select your bank to connect your accounts securely
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="space-y-6">
            {/* Security Notice */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <View className="mb-2 flex-row items-center gap-2">
                  <Ionicons name="shield-checkmark-outline" size={16} color="#166534" />
                  <Text className="text-sm font-medium text-green-800">Bank-level Security</Text>
                </View>
                <Text className="text-sm text-green-700">
                  Your credentials are encrypted using industry-standard security protocols. We
                  never store your banking passwords.
                </Text>
              </CardContent>
            </Card>

            {/* Connected Accounts */}
            {bankAccounts.length > 0 && step === 'banks' && (
              <View className="space-y-3">
                <Text className="text-lg font-semibold text-gray-900">Connected Accounts</Text>
                <View className="space-y-2">
                  {bankAccounts.map((account: BankAccount) => (
                    <Card key={account.id} className="border-gray-200">
                      <CardContent className="p-4">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 flex-row items-center gap-3">
                            {getAccountIcon(account.accountType)}
                            <View className="flex-1">
                              <Text className="font-medium text-gray-900" numberOfLines={1}>
                                {account.accountName} {account.mask && `••••${account.mask}`}
                              </Text>
                              <Text className="text-sm text-gray-600" numberOfLines={1}>
                                {account.institutionName} • {account.accountType}
                              </Text>
                              <Text className="text-xs text-gray-500">
                                {formatLastSync(account.lastSyncAt)}
                              </Text>
                            </View>
                          </View>
                          <Badge variant={account.isActive ? 'default' : 'secondary'}>
                            <View className="flex-row items-center gap-1">
                              <Ionicons
                                name={
                                  account.isActive
                                    ? 'checkmark-circle-outline'
                                    : 'alert-circle-outline'
                                }
                                size={12}
                                color={account.isActive ? '#10B981' : '#6B7280'}
                              />
                              <Text className="text-xs">
                                {account.isActive ? 'Active' : 'Inactive'}
                              </Text>
                            </View>
                          </Badge>
                        </View>
                      </CardContent>
                    </Card>
                  ))}
                </View>
              </View>
            )}

            {/* Bank Selection */}
            {step === 'banks' && (
              <View className="space-y-4">
                <Text className="text-lg font-semibold text-gray-900">Choose Your Bank</Text>
                <View className="grid grid-cols-2 gap-3">
                  {DEMO_BANKS.map((bank) => (
                    <Button
                      key={bank.id}
                      variant="outline"
                      className="h-auto p-4"
                      onPress={() => handleBankSelect(bank)}>
                      <View className="items-center">
                        <Text className="mb-2 text-2xl">{bank.logo}</Text>
                        <Text className="text-center text-sm font-medium" numberOfLines={2}>
                          {bank.name}
                        </Text>
                      </View>
                    </Button>
                  ))}
                </View>
              </View>
            )}

            {/* Account Selection */}
            {step === 'accounts' && selectedBank && (
              <View className="space-y-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-2xl">{selectedBank.logo}</Text>
                    <View>
                      <Text className="text-lg font-semibold text-gray-900">
                        {selectedBank.name}
                      </Text>
                      <Text className="text-sm text-gray-600">Select accounts to connect</Text>
                    </View>
                  </View>
                  <Button variant="ghost" size="sm" onPress={() => setStep('banks')}>
                    <Ionicons name="arrow-back" size={16} color="#6B7280" />
                  </Button>
                </View>

                <View className="space-y-2">
                  {selectedBank.accounts.map((account, index) => {
                    const accountKey = `${selectedBank.id}_${index}`;
                    const isSelected = selectedAccounts.includes(accountKey);

                    return (
                      <Card
                        key={index}
                        className={`border-2 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                        <CardContent className="p-4">
                          <Button
                            variant="ghost"
                            className="w-full justify-start p-0"
                            onPress={() => handleAccountToggle(index)}>
                            <View className="w-full flex-row items-center justify-between">
                              <View className="flex-row items-center gap-3">
                                {getAccountIcon(account.type)}
                                <View>
                                  <Text className="font-medium text-gray-900">{account.name}</Text>
                                  <Text className="text-sm text-gray-600">
                                    {account.type} • ••••{account.mask}
                                  </Text>
                                </View>
                              </View>
                              <View
                                className={`h-5 w-5 rounded border-2 ${
                                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                } items-center justify-center`}>
                                {isSelected && (
                                  <Ionicons name="checkmark" size={12} color="white" />
                                )}
                              </View>
                            </View>
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </View>

                <View className="flex-row gap-3 pt-4">
                  <Button
                    title="Back"
                    variant="outline"
                    className="flex-1"
                    onPress={() => setStep('banks')}>
                    Back
                  </Button>
                  <Button
                    title={`Connect ${selectedAccounts.length > 0 && `(${selectedAccounts.length})`}`}
                    className="flex-1"
                    disabled={selectedAccounts.length === 0}
                    onPress={handleConnect}>
                    Connect {selectedAccounts.length > 0 && `(${selectedAccounts.length})`}
                  </Button>
                </View>
              </View>
            )}

            {/* Connecting State */}
            {step === 'connecting' && (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="mt-4 text-lg font-medium text-gray-900">
                  Connecting to {selectedBank?.name}...
                </Text>
                <Text className="mt-2 text-center text-sm text-gray-600">
                  Securely linking your selected accounts
                </Text>
              </View>
            )}

            {/* Benefits */}
            {step === 'banks' && (
              <View className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <View className="mb-2 flex-row items-center gap-2">
                      <Ionicons name="refresh-outline" size={16} color="#2563EB" />
                      <Text className="text-sm font-medium text-blue-900">Auto-Sync</Text>
                    </View>
                    <Text className="text-sm text-blue-800">
                      Transactions sync automatically and are categorized with AI assistance.
                    </Text>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <View className="mb-2 flex-row items-center gap-2">
                      <Ionicons name="analytics-outline" size={16} color="#9333EA" />
                      <Text className="text-sm font-medium text-purple-900">Smart Insights</Text>
                    </View>
                    <Text className="text-sm text-purple-800">
                      Get personalized spending insights and budget recommendations.
                    </Text>
                  </CardContent>
                </Card>
              </View>
            )}
          </View>
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}
