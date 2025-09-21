import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import HeaderProfileButton from '@/components/HeaderProfileButton';
import { useAuth } from '@/context/useAuth';
import { useAppData } from '../_layout';
import { useVectorStore } from '@/context/RAGContext';
import { useRAG } from 'react-native-rag';
import type { Transaction, Category, CategoryBreakdown } from '@/context/DataContext';

function InsightsTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const { username: authUsername } = useAuth();
  const { summary, insights, user, transactions, categories, summaryLoading, insightsLoading } =
    useAppData();
  const { vectorStore, llm, embeddingsProgress, llmProgress, embeddingsInstalled, llmInstalled } =
    useVectorStore();

  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant' | 'system'; content: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const messagesScrollRef = useRef<ScrollView | null>(null);
  const liveAssistantIndexRef = useRef<number | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  const rag = useRAG({
    vectorStore: vectorStore as any,
    llm: llm as any,
    preventLoad: !vectorStore || !llm || !isFocused,
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isFocused && rag.isGenerating) {
      rag.interrupt().catch(() => {});
    }
  }, [isFocused, rag]);

  useEffect(() => {
    if (!rag.isReady || !transactions || !categories || !summary || dataLoaded) return;

    const loadFinancialData = async () => {
      try {
        setIsLoading(true);
        const documents: { pageContent: string; metadata: Record<string, any> }[] = [];

        if (transactions?.length) {
          const now = new Date();
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          const recent = transactions
            .filter((tx: Transaction) => new Date(tx.date) >= ninetyDaysAgo)
            .slice(-500);

          recent.forEach((tx) => {
            const category = categories?.find((cat) => cat.id === tx.categoryId);
            const categoryName = category?.name || 'Uncategorized';
            const pageContent =
              `Transaction: ${tx.description} for $${tx.amount} on ${tx.date} in category ${categoryName}. Type: ${tx.type}`.slice(
                0,
                256
              );
            documents.push({
              pageContent,
              metadata: {
                type: 'transaction',
                id: tx.id.toString(),
                categoryId: tx.categoryId?.toString() || '',
                txType: tx.type,
              },
            });
          });
        }

        if (categories?.length) {
          categories.forEach((cat: Category) => {
            documents.push({
              pageContent: `Category: ${cat.name} with monthly budget of $${cat.budget}. Icon: ${cat.icon}, Color: ${cat.color}`,
              metadata: { type: 'category', id: cat.id.toString(), name: cat.name },
            });
          });
        }

        if (summary) {
          documents.push({
            pageContent:
              `Financial Summary: Total income baseline $${summary.incomeBaseline || summary.totalIncome}, Total expenses $${summary.totalExpenses}, Total budget $${summary.totalBudget}, Remaining budget $${summary.remainingBudget}`.slice(
                0,
                280
              ),
            metadata: { type: 'summary' },
          });

          summary.categoryBreakdown?.forEach((breakdown: CategoryBreakdown) => {
            documents.push({
              pageContent:
                `Category breakdown: ${breakdown.name} has budget $${breakdown.budget}, spent $${breakdown.spent}, which is ${breakdown.percentage}% of budget`.slice(
                  0,
                  240
                ),
              metadata: {
                type: 'category-breakdown',
                categoryId: breakdown.id.toString(),
                categoryName: breakdown.name,
              },
            });
          });
        }

        if (insights?.length) {
          insights.forEach((insight) => {
            documents.push({
              pageContent:
                `Insight: ${insight.title} - ${insight.description}. Type: ${insight.type}, Severity: ${insight.severity}`.slice(
                  0,
                  240
                ),
              metadata: { type: 'insight', insightType: insight.type, severity: insight.severity },
            });
          });
        }

        if (documents.length) {
          for (const doc of documents) {
            try {
              await rag.addDocument(doc.pageContent, doc.metadata);
            } catch (error) {
              console.warn('Add doc failed:', error);
            }
          }
        }

        setDataLoaded(true);
        setMessages([
          {
            role: 'system',
            content:
              'I can help answer questions about your finances based on your transaction history and budget data.',
          },
          {
            role: 'assistant',
            content: `Hi ${authUsername || user?.username || 'there'}! I can help you understand your finances. Try asking questions like "How much did I spend on groceries this month?" or "Am I on track with my budget?"`,
          },
        ]);
      } catch (error) {
        console.error('Error loading data into vector store:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFinancialData();
  }, [rag, transactions, categories, summary, insights, user, authUsername, dataLoaded]);

  const looksTruncated = useCallback((text: string) => {
    if (!text) return false;
    const trimmed = text.trim();
    if (!/[.!?]$/.test(trimmed) && trimmed.length > 120) return true;
    if (/\n\s*\d+\.$/.test(trimmed)) return true;
    if (/[,:;-]$/.test(trimmed) && trimmed.length > 80) return true;
    return false;
  }, []);

  const handleSubmitQuery = useCallback(async () => {
    if (!query.trim() || !vectorStore) return;

    try {
      setIsLoading(true);
      const userMessage = { role: 'user' as const, content: query };
      setMessages((prev) => [...prev, userMessage]);
      setQuery('');

      const history = [
        {
          role: 'system' as const,
          content:
            "You are a helpful personal finance assistant running on-device. Answer using only the provided context from the user's transactions, categories, and budget summary. Prefer the current month unless the user specifies a timeframe. Show currency as $X,XXX.XX. Be concise and actionable.",
        },
        ...messages,
        userMessage,
      ];

      setMessages((prev) => {
        const idx = prev.length;
        liveAssistantIndexRef.current = idx;
        return [...prev, { role: 'assistant', content: '' }];
      });

      const response = await rag.generate(history, {
        augmentedGeneration: true,
        k: 3,
        promptGenerator: (msgs, retrieved) => {
          const last = msgs[msgs.length - 1];
          const ctx = retrieved.map((d, i) => `#${i + 1}: ${d.content}`).join('\n');
          return `User question: ${last?.content}\nContext (most relevant first):\n${ctx}\nGuidelines: Use only the context. If unclear, ask a brief follow-up.`;
        },
      });

      setMessages((prev) => {
        const next = [...prev];
        const idx = liveAssistantIndexRef.current;
        if (idx != null && next[idx]) {
          next[idx] = { role: 'assistant', content: response };
        }
        return next;
      });

      if (!isContinuing && looksTruncated(response)) {
        setIsContinuing(true);
        const idx = liveAssistantIndexRef.current;
        try {
          const continuation = await rag.generate(
            [
              {
                role: 'system' as const,
                content:
                  'Continue the previous answer. Do not repeat previous lines. Finish the list or sentence succinctly.',
              },
              ...messages,
              userMessage,
              { role: 'assistant' as const, content: response },
              { role: 'user' as const, content: 'Continue.' },
            ],
            { augmentedGeneration: false }
          );

          setMessages((prev) => {
            const next = [...prev];
            if (idx != null && next[idx]) {
              next[idx] = {
                role: 'assistant',
                content: `${(next[idx] as any).content}\n${continuation}`,
              } as any;
            }
            return next;
          });
        } catch (error) {
          console.warn('Continuation failed', error);
        } finally {
          setIsContinuing(false);
        }
      }
    } catch (error) {
      console.error('Error processing query:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [query, vectorStore, messages, rag, isContinuing, looksTruncated]);

  useEffect(() => {
    if (!rag.isGenerating) return;
    const idx = liveAssistantIndexRef.current;
    if (idx == null) return;
    setMessages((prev) => {
      const next = [...prev];
      if (next[idx]) next[idx] = { role: 'assistant', content: rag.response || '' };
      return next;
    });
  }, [rag.response, rag.isGenerating]);

  const isSetupPending = !rag.isReady || !vectorStore || !llm;
  const isAssistantLoading = summaryLoading || insightsLoading || (!dataLoaded && isLoading);

  const heroTitle = isSetupPending
    ? 'Setting up your local assistant'
    : isAssistantLoading
      ? 'Analyzing your financial data'
      : `Hi ${authUsername || user?.username || 'there'}`;

  const heroSubtitle = isSetupPending
    ? 'Downloading on-device models so insights stay private.'
    : isAssistantLoading
      ? 'Crunching recent activity to tailor recommendations for you.'
      : 'Ask about spending, budgets, goals, or anything money-related.';

  const statusBadgeBg = isSetupPending
    ? 'bg-warning-100'
    : isAssistantLoading
      ? 'bg-info-100'
      : 'bg-success-100';
  const statusBadgeText = isSetupPending
    ? 'text-warning-700'
    : isAssistantLoading
      ? 'text-info-700'
      : 'text-success-700';
  const statusLabel = isSetupPending ? 'Preparing' : isAssistantLoading ? 'Processing' : 'Ready';

  const embeddingsPercent = Math.round(((embeddingsInstalled ? 1 : embeddingsProgress) || 0) * 100);
  const llmPercent = Math.round(((llmInstalled ? 1 : llmProgress) || 0) * 100);

  const quickPrompt = useCallback(() => {
    const prompt = 'Summarize my top three spending categories this month.';
    setQuery(prompt);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const hasUserMessages = messages.some((m) => m.role === 'user');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 122 : 0}
      style={{ flex: 1 }}>
      <View className="flex-1 bg-app-background">
        <Stack.Screen
          options={{
            title: '',
            headerTransparent: true,
            headerShadowVisible: false,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.push('/profile')}
                accessibilityLabel="Open profile"
                className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-app-surface shadow-xs">
                <Ionicons name="menu-outline" size={20} color="#0F172A" />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <View className="flex-row items-center gap-3 pr-3">
                <TouchableOpacity
                  onPress={() => messagesScrollRef.current?.scrollToEnd({ animated: true })}
                  accessibilityLabel="Scroll to latest"
                  className="h-10 w-10 items-center justify-center rounded-full bg-app-surface shadow-xs">
                  <Ionicons name="sparkles-outline" size={20} color="#0F172A" />
                </TouchableOpacity>
                <HeaderProfileButton />
              </View>
            ),
          }}
        />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: Math.max(insets.top + 8, 32),
            paddingBottom: Math.max(insets.bottom, 12) + keyboardInset,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
          <View className="flex-1 px-5">
            {!hasUserMessages ? (
              <View className="mb-6 rounded-3xl border border-app-border bg-app-surface px-6 py-7 shadow-md">
                <View className="flex-row items-start justify-between">
                  <View className="max-w-[70%]">
                    <Text className="text-sm font-medium text-app-text-muted">
                      Financial insights
                    </Text>
                    <Text className="mt-1 text-3xl font-semibold text-app-text">{heroTitle}</Text>
                    <Text className="mt-2 text-xs text-app-text-muted">{heroSubtitle}</Text>
                  </View>
                  <View className="items-end">
                    <View className={`rounded-full px-3 py-1 ${statusBadgeBg}`}>
                      <Text className={`text-xs font-semibold ${statusBadgeText}`}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                </View>

                {isSetupPending ? (
                  <View className="mt-6 space-y-4">
                    <View>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-medium text-app-text-muted">Embeddings</Text>
                        <Text className="text-xs font-semibold text-app-text">
                          {embeddingsInstalled ? 'Installed' : `${embeddingsPercent}%`}
                        </Text>
                      </View>
                      <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-app-border">
                        <View
                          className="h-2 rounded-full bg-primary-500"
                          style={{ width: `${embeddingsPercent}%` }}
                        />
                      </View>
                    </View>
                    <View>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-medium text-app-text-muted">
                          Language model
                        </Text>
                        <Text className="text-xs font-semibold text-app-text">
                          {llmInstalled ? 'Installed' : `${llmPercent}%`}
                        </Text>
                      </View>
                      <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-app-border">
                        <View
                          className="h-2 rounded-full bg-primary-500"
                          style={{ width: `${llmPercent}%` }}
                        />
                      </View>
                    </View>
                    <Text className="text-xs text-app-text-muted">
                      Runs entirely on-device. First-time setup may take a minute.
                    </Text>
                  </View>
                ) : (
                  <View className="mt-6 flex-row items-center justify-between rounded-2xl bg-app-surface-alt px-4 py-3">
                    <View className="flex-1 pr-4">
                      <Text className="text-xs font-medium text-app-text-secondary">Quick tip</Text>
                      <Text className="mt-1 text-sm text-app-text-muted">
                        {insights && insights.length > 0
                          ? insights[0].description
                          : 'Try “How much have I spent on groceries this month?”'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={quickPrompt}
                      className="rounded-full bg-primary-500 px-4 py-2">
                      <Text className="text-xs font-semibold text-white">Use prompt</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-app-border bg-app-surface px-4 py-3 shadow-sm">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-medium text-app-text-muted">
                    Financial insights
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-app-text">{heroTitle}</Text>
                  <Text className="mt-1 text-xs text-app-text-muted">{heroSubtitle}</Text>
                </View>
                <View className={`rounded-full px-3 py-1 ${statusBadgeBg}`}>
                  <Text className={`text-xs font-semibold ${statusBadgeText}`}>{statusLabel}</Text>
                </View>
              </View>
            )}

            <View className="flex-1 rounded-3xl border border-app-border bg-app-surface px-4 py-5 shadow-sm">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-base font-semibold text-app-text">
                  Financial AI assistant
                </Text>
                {isLoading && !isSetupPending && (
                  <View className="flex-row items-center rounded-full bg-app-surface-alt px-3 py-1">
                    <ActivityIndicator size="small" color="#0EA5E9" />
                    <Text className="ml-2 text-xs font-medium text-app-text-muted">Analyzing…</Text>
                  </View>
                )}
              </View>

              {isSetupPending ? (
                <View className="flex-1 items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface-alt px-4">
                  <Text className="text-sm font-medium text-app-text">
                    We’re getting things ready
                  </Text>
                  <Text className="mt-2 text-xs text-app-text-muted">
                    Chat will unlock once downloads finish.
                  </Text>
                </View>
              ) : isAssistantLoading ? (
                <View className="flex-1 items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface-alt px-4">
                  <ActivityIndicator size="large" color="#0EA5E9" />
                  <Text className="mt-3 text-sm font-medium text-app-text-muted">
                    Analyzing your financial data…
                  </Text>
                </View>
              ) : (
                <ScrollView
                  nestedScrollEnabled
                  ref={(r) => (messagesScrollRef.current = r)}
                  className="flex-1"
                  contentContainerStyle={{ paddingBottom: 16 }}
                  keyboardShouldPersistTaps="handled"
                  onContentSizeChange={() =>
                    messagesScrollRef.current?.scrollToEnd({ animated: true })
                  }>
                  {messages
                    .filter((m) => m.role !== 'system')
                    .map((message, index) => (
                      <View
                        key={index}
                        className={`mt-2 max-w-[85%] rounded-3xl px-4 py-3 shadow-sm ${
                          message.role === 'user'
                            ? 'self-end bg-primary-500'
                            : 'self-start border border-app-border bg-app-surface-alt'
                        }`}>
                        <Text
                          className={`text-sm leading-relaxed ${
                            message.role === 'user' ? 'text-white' : 'text-app-text'
                          }`}>
                          {message.content}
                        </Text>
                      </View>
                    ))}

                  {messages.filter((m) => m.role !== 'system').length === 0 &&
                    !rag.isGenerating && (
                      <View className="mt-6 self-start rounded-3xl border border-dashed border-app-border bg-app-surface-alt px-4 py-3">
                        <Text className="text-sm font-medium text-app-text">
                          Ask something like:
                        </Text>
                        <Text className="mt-2 text-xs text-app-text-muted">
                          • Where did most of my money go this month?
                        </Text>
                        <Text className="mt-1 text-xs text-app-text-muted">
                          • Am I on track with my savings goals?
                        </Text>
                        <Text className="mt-1 text-xs text-app-text-muted">
                          • How much did I spend on dining last week?
                        </Text>
                      </View>
                    )}

                  {rag.isGenerating && (
                    <View className="mt-3 flex-row items-center self-start rounded-3xl bg-app-surface-alt px-4 py-3">
                      <ActivityIndicator size="small" color="#0EA5E9" />
                      <Text className="ml-2 text-xs text-app-text-muted">Generating response…</Text>
                    </View>
                  )}
                </ScrollView>
              )}

              <SafeAreaView edges={['bottom']}>
                <View className="mt-4 flex-row items-center rounded-full border border-app-border bg-app-surface px-4 py-2 shadow-xs">
                  <TextInput
                    ref={inputRef}
                    className="flex-1 text-sm text-app-text"
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Ask anything about your money..."
                    placeholderTextColor="#94A3B8"
                    editable={!isSetupPending && !isAssistantLoading && !isLoading}
                    maxLength={200}
                    returnKeyType="send"
                    onSubmitEditing={handleSubmitQuery}
                  />
                  <TouchableOpacity
                    onPress={handleSubmitQuery}
                    disabled={!query.trim() || isSetupPending || isAssistantLoading || isLoading}
                    className={`ml-3 h-10 w-10 items-center justify-center rounded-full bg-primary-500 ${
                      !query.trim() || isSetupPending || isAssistantLoading || isLoading
                        ? 'opacity-40'
                        : ''
                    }`}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="send" size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

export default InsightsTab;
