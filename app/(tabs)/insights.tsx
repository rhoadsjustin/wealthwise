import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { Button } from '@/components/Button';
import { useAuth } from '@/context/useAuth';
import { useAppData } from '../_layout';
import { useVectorStore } from '@/context/RAGContext';
import { useRAG } from 'react-native-rag';
import type { Transaction, Category, CategoryBreakdown } from '@/context/DataContext';
import {
  buildBudgetSnapshots,
  trainBudgetInsights,
  type BudgetInsightsPayload,
  type BudgetSnapshot,
  type BudgetClassification,
  type BudgetRecommendation,
} from '@/lib/ai/appleBudgetAdvisor';
import { runAppleBudgetChat, type AppleChatMessage } from '@/lib/ai/appleBudgetChat';

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
  const [insightsMode, setInsightsMode] = useState<'assistant' | 'apple'>('assistant');
  const [appleResult, setAppleResult] = useState<BudgetInsightsPayload | null>(null);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleError, setAppleError] = useState<string | null>(null);
  const [lastAppleHash, setLastAppleHash] = useState<string | null>(null);
  const [appleChatMessages, setAppleChatMessages] = useState<AppleChatMessage[]>([]);
  const [appleChatInput, setAppleChatInput] = useState('');
  const [appleChatLoading, setAppleChatLoading] = useState(false);
  const [appleChatError, setAppleChatError] = useState<string | null>(null);

  const messagesScrollRef = useRef<ScrollView | null>(null);
  const liveAssistantIndexRef = useRef<number | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const appleChatScrollRef = useRef<ScrollView | null>(null);

  const isAssistantMode = insightsMode === 'assistant';

  const appleSnapshots = useMemo<BudgetSnapshot[]>(
    () => buildBudgetSnapshots({ transactions, categories, monthsBack: 6 }),
    [transactions, categories]
  );

  const appleSnapshotMap = useMemo(() => {
    const map = new Map<string, BudgetSnapshot>();
    appleSnapshots.forEach((snapshot) => {
      map.set(`${snapshot.categoryId}:${snapshot.month}`, snapshot);
    });
    return map;
  }, [appleSnapshots]);

  const snapshotsKey = useMemo(() => {
    if (!appleSnapshots.length) return null;
    return appleSnapshots
      .map(
        (snapshot) =>
          `${snapshot.categoryId}:${snapshot.month}:${snapshot.budget.toFixed(2)}:${snapshot.spent.toFixed(2)}`
      )
      .join('|');
  }, [appleSnapshots]);

  const appleMonthsWindow = useMemo(() => {
    if (!appleSnapshots.length) return null;
    const uniqueMonths = Array.from(
      new Set(appleSnapshots.map((snapshot) => snapshot.month))
    ).sort();
    return {
      first: uniqueMonths[0],
      last: uniqueMonths[uniqueMonths.length - 1],
      count: uniqueMonths.length,
    };
  }, [appleSnapshots]);

  const appleLatestMonth = useMemo(() => {
    if (appleResult?.classifications?.length) {
      return appleResult.classifications
        .map((entry) => entry.month)
        .sort()
        .pop();
    }
    return appleMonthsWindow?.last ?? null;
  }, [appleResult, appleMonthsWindow]);

  const appleChatContext = useMemo(
    () => ({ summary, categories, transactions }),
    [summary, categories, transactions]
  );

  const appleGreetingName = useMemo(
    () => authUsername || user?.username || 'there',
    [authUsername, user?.username]
  );

  const latestClassifications = useMemo<BudgetClassification[]>(() => {
    if (!appleResult?.classifications?.length || !appleLatestMonth) return [];
    return appleResult.classifications.filter((entry) => entry.month === appleLatestMonth);
  }, [appleResult, appleLatestMonth]);

  const classificationList = useMemo(() => {
    if (!appleResult?.classifications?.length) return [];
    if (latestClassifications.length) return latestClassifications;
    return appleResult.classifications;
  }, [appleResult, latestClassifications]);

  const classificationByCategoryId = useMemo(() => {
    const map = new Map<number, BudgetClassification>();
    classificationList.forEach((entry) => {
      map.set(entry.categoryId, entry);
    });
    return map;
  }, [classificationList]);

  const recommendations = useMemo<BudgetRecommendation[]>(() => {
    return appleResult?.recommendations ?? [];
  }, [appleResult]);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    []
  );

  const formatMonthLabel = useCallback((month: string | null | undefined) => {
    if (!month) return '';
    const [year, monthPart] = month.split('-');
    const yearNum = Number(year);
    const monthNum = Number(monthPart);
    if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum)) return month;
    const date = new Date(yearNum, monthNum - 1, 1);
    if (Number.isNaN(date.getTime())) return month;
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  }, []);

  const getStatusStyles = useCallback((status: string) => {
    switch (status) {
      case 'over':
        return { bg: 'bg-error-100', text: 'text-error-700', label: 'Over budget' };
      case 'under':
        return { bg: 'bg-warning-100', text: 'text-warning-700', label: 'Under budget' };
      case 'balanced':
        return { bg: 'bg-success-100', text: 'text-success-700', label: 'Balanced' };
      default:
        return { bg: 'bg-info-100', text: 'text-info-700', label: status };
    }
  }, []);

  const buildRecommendationCopy = useCallback(
    (classification?: BudgetClassification, snapshot?: BudgetSnapshot) => {
      if (!classification || !snapshot) {
        return 'Retrain after updating budgets to see refreshed guidance.';
      }
      const ratioPercent = Math.round(classification.spendRatio * 100);
      switch (classification.predictedStatus) {
        case 'over':
          return `Model suggests tightening this category — spending is ${ratioPercent}% of plan.`;
        case 'under':
          return `You are underspending here (${ratioPercent}% of budget). Consider reallocating funds.`;
        default:
          return `This category is on track at ${ratioPercent}% of budget. Maintain or fine-tune as needed.`;
      }
    },
    []
  );

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
    if (!isAssistantMode) return;
    if (!isFocused && rag.isGenerating) {
      rag.interrupt().catch(() => {});
    }
  }, [isFocused, rag, isAssistantMode]);

  useEffect(() => {
    if (!isAssistantMode) return;
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
  }, [
    rag,
    transactions,
    categories,
    summary,
    insights,
    user,
    authUsername,
    dataLoaded,
    isAssistantMode,
  ]);

  const looksTruncated = useCallback((text: string) => {
    if (!text) return false;
    const trimmed = text.trim();
    if (!/[.!?]$/.test(trimmed) && trimmed.length > 120) return true;
    if (/\n\s*\d+\.$/.test(trimmed)) return true;
    if (/[,:;-]$/.test(trimmed) && trimmed.length > 80) return true;
    return false;
  }, []);

  const handleSubmitQuery = useCallback(async () => {
    if (!isAssistantMode) return;
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
  }, [query, vectorStore, messages, rag, isContinuing, looksTruncated, isAssistantMode]);

  useEffect(() => {
    if (!isAssistantMode) return;
    if (!rag.isGenerating) return;
    const idx = liveAssistantIndexRef.current;
    if (idx == null) return;
    setMessages((prev) => {
      const next = [...prev];
      if (next[idx]) next[idx] = { role: 'assistant', content: rag.response || '' };
      return next;
    });
  }, [rag.response, rag.isGenerating, isAssistantMode]);

  const assistantSetupPending = !rag.isReady || !vectorStore || !llm;
  const assistantDataLoading = summaryLoading || insightsLoading || (!dataLoaded && isLoading);
  const isSetupPending = isAssistantMode && assistantSetupPending;
  const isAssistantLoading = isAssistantMode && assistantDataLoading;

  const assistantHeroTitle = assistantSetupPending
    ? 'Setting up your local assistant'
    : assistantDataLoading
      ? 'Analyzing your financial data'
      : `Hi ${authUsername || user?.username || 'there'}`;

  const assistantHeroSubtitle = assistantSetupPending
    ? 'Downloading on-device models so insights stay private.'
    : assistantDataLoading
      ? 'Crunching recent activity to tailor recommendations for you.'
      : 'Ask about spending, budgets, goals, or anything money-related.';

  const assistantStatusBadgeBg = assistantSetupPending
    ? 'bg-warning-100'
    : assistantDataLoading
      ? 'bg-info-100'
      : 'bg-success-100';
  const assistantStatusBadgeText = assistantSetupPending
    ? 'text-warning-700'
    : assistantDataLoading
      ? 'text-info-700'
      : 'text-success-700';
  const assistantStatusLabel = assistantSetupPending
    ? 'Preparing'
    : assistantDataLoading
      ? 'Processing'
      : 'Ready';

  const appleHasResult = !!appleResult && !appleError;
  const appleStatusLabel = appleLoading
    ? 'Training'
    : appleError
      ? 'Needs attention'
      : appleHasResult
        ? 'Ready'
        : 'Idle';
  const appleStatusBadgeBg = appleLoading
    ? 'bg-info-100'
    : appleError
      ? 'bg-error-100'
      : appleHasResult
        ? 'bg-success-100'
        : 'bg-app-surface-alt';
  const appleStatusBadgeText = appleLoading
    ? 'text-info-700'
    : appleError
      ? 'text-error-700'
      : appleHasResult
        ? 'text-success-700'
        : 'text-app-text-muted';
  const appleHeroTitle = appleLoading
    ? 'Training your budget coach'
    : appleError
      ? 'Check your budget data'
      : appleHasResult
        ? 'Apple budget coach ready'
        : 'Apple budget coach';
  const appleHeroSubtitle = appleLoading
    ? 'Crunching your recent budgets securely on-device.'
    : (appleError ?? 'Train Apple’s on-device model on your recent budgets for tailored guidance.');

  const heroTitle = isAssistantMode ? assistantHeroTitle : appleHeroTitle;
  const heroSubtitle = isAssistantMode ? assistantHeroSubtitle : appleHeroSubtitle;
  const statusBadgeBg = isAssistantMode ? assistantStatusBadgeBg : appleStatusBadgeBg;
  const statusBadgeText = isAssistantMode ? assistantStatusBadgeText : appleStatusBadgeText;
  const statusLabel = isAssistantMode ? assistantStatusLabel : appleStatusLabel;

  const embeddingsPercent = Math.round(((embeddingsInstalled ? 1 : embeddingsProgress) || 0) * 100);
  const llmPercent = Math.round(((llmInstalled ? 1 : llmProgress) || 0) * 100);

  const quickPrompt = useCallback(() => {
    const prompt = 'Summarize my top three spending categories this month.';
    setQuery(prompt);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (insightsMode !== 'apple') return;

    if (!appleSnapshots.length) {
      setAppleLoading(false);
      setAppleResult(null);
      setAppleError(
        'Add at least one budgeted category with recent expenses to train the Apple model.'
      );
      setLastAppleHash(null);
      return;
    }

    if (snapshotsKey && snapshotsKey === lastAppleHash) return;

    let cancelled = false;
    setAppleLoading(true);
    setAppleError(null);

    trainBudgetInsights(appleSnapshots)
      .then((payload) => {
        if (cancelled) return;
        setAppleResult(payload);
        setLastAppleHash(snapshotsKey ?? null);
      })
      .catch((error) => {
        if (cancelled) return;
        const nativeCode = (error as { code?: string })?.code;
        let message = (error as Error)?.message ?? 'Unable to train the Apple budget model.';
        if (nativeCode === 'feature_unavailable' || /Create ML/i.test(message)) {
          message = 'Apple on-device training is not supported on this device configuration.';
        } else if (nativeCode === 'insufficient_samples') {
          message = 'Need at least three budget snapshots to train the Apple model.';
        }
        setAppleResult(null);
        setAppleError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setAppleLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [insightsMode, appleSnapshots, snapshotsKey, lastAppleHash]);

  useEffect(() => {
    if (insightsMode !== 'apple') return;
    if (appleChatMessages.length > 0) return;
    setAppleChatMessages([
      {
        role: 'assistant',
        content: `Hi ${appleGreetingName}! I’m your on-device Apple budget advisor. Ask about budgets or spending and I’ll pull the latest numbers securely.`,
      },
    ]);
  }, [insightsMode, appleChatMessages.length, appleGreetingName]);

  const handleRetrain = useCallback(async () => {
    if (!appleSnapshots.length) {
      setAppleError(
        'Add at least one budgeted category with recent expenses to train the Apple model.'
      );
      setAppleResult(null);
      return;
    }

    try {
      setAppleLoading(true);
      setAppleError(null);
      const payload = await trainBudgetInsights(appleSnapshots);
      setAppleResult(payload);
      setLastAppleHash(snapshotsKey ?? null);
    } catch (error) {
      const nativeCode = (error as { code?: string })?.code;
      let message = (error as Error)?.message ?? 'Unable to train the Apple budget model.';
      if (nativeCode === 'feature_unavailable' || /Create ML/i.test(message)) {
        message = 'Apple on-device training is not supported on this device configuration.';
      } else if (nativeCode === 'insufficient_samples') {
        message = 'Need at least three budget snapshots to train the Apple model.';
      }
      setAppleResult(null);
      setAppleError(message);
    } finally {
      setAppleLoading(false);
    }
  }, [appleSnapshots, snapshotsKey]);

  const handleAppleChatSubmit = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      setAppleChatError('Apple budget chat requires an iOS device.');
      return;
    }
    if (appleChatLoading) return;
    const trimmed = appleChatInput.trim();
    if (!trimmed) return;

    const userMessage: AppleChatMessage = { role: 'user', content: trimmed };
    const optimisticHistory = [...appleChatMessages, userMessage];
    setAppleChatMessages(optimisticHistory);
    setAppleChatInput('');
    setAppleChatLoading(true);
    setAppleChatError(null);

    try {
      const result = await runAppleBudgetChat({
        prompt: trimmed,
        history: appleChatMessages,
        context: appleChatContext,
      });
      setAppleChatMessages(result.messages);
      requestAnimationFrame(() => {
        appleChatScrollRef.current?.scrollToEnd({ animated: true });
      });
    } catch (error) {
      const message =
        (error as Error)?.message ?? 'Unable to retrieve Apple budget guidance right now.';
      setAppleChatError(message);
      setAppleChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I ran into an issue fetching that information. Please try again in a moment.',
        },
      ]);
    } finally {
      setAppleChatLoading(false);
    }
  }, [appleChatInput, appleChatMessages, appleChatLoading, appleChatContext]);

  const hasUserMessages = isAssistantMode && messages.some((m) => m.role === 'user');

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
            <View className="mb-5 flex-row rounded-full bg-app-surface-alt p-1">
              <Button
                size="sm"
                variant={isAssistantMode ? 'default' : 'ghost'}
                className="flex-1"
                title="Assistant"
                onPress={() => setInsightsMode('assistant')}
              />
              <Button
                size="sm"
                variant={isAssistantMode ? 'ghost' : 'default'}
                className="ml-2 flex-1"
                title="Apple coach"
                onPress={() => setInsightsMode('apple')}
              />
            </View>

            {isAssistantMode ? (
              <>
                {!hasUserMessages ? (
                  <View className="mb-6 rounded-3xl border border-app-border bg-app-surface px-6 py-7 shadow-md">
                    <View className="flex-row items-start justify-between">
                      <View className="max-w-[70%]">
                        <Text className="text-sm font-medium text-app-text-muted">
                          Financial insights
                        </Text>
                        <Text className="mt-1 text-3xl font-semibold text-app-text">
                          {heroTitle}
                        </Text>
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
                            <Text className="text-xs font-medium text-app-text-muted">
                              Embeddings
                            </Text>
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
                          <Text className="text-xs font-medium text-app-text-secondary">
                            Quick tip
                          </Text>
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
                      <Text className="mt-1 text-base font-semibold text-app-text">
                        {heroTitle}
                      </Text>
                      <Text className="mt-1 text-xs text-app-text-muted">{heroSubtitle}</Text>
                    </View>
                    <View className={`rounded-full px-3 py-1 ${statusBadgeBg}`}>
                      <Text className={`text-xs font-semibold ${statusBadgeText}`}>
                        {statusLabel}
                      </Text>
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
                        <Text className="ml-2 text-xs font-medium text-app-text-muted">
                          Analyzing…
                        </Text>
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
                          <Text className="ml-2 text-xs text-app-text-muted">
                            Generating response…
                          </Text>
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
                        disabled={
                          !query.trim() || isSetupPending || isAssistantLoading || isLoading
                        }
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
              </>
            ) : (
              <>
                <View className="mb-6 rounded-3xl border border-app-border bg-app-surface px-6 py-7 shadow-md">
                  <View className="flex-row items-start justify-between">
                    <View className="max-w-[72%]">
                      <Text className="text-sm font-medium text-app-text-muted">
                        Apple budget coach
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

                  <View className="mt-6 flex-row flex-wrap items-start gap-4">
                    <View>
                      <Text className="text-xs font-medium text-app-text-muted">
                        Training window
                      </Text>
                      <Text className="mt-1 text-sm font-semibold text-app-text">
                        {appleMonthsWindow
                          ? `${formatMonthLabel(appleMonthsWindow.first)} – ${formatMonthLabel(appleMonthsWindow.last)}`
                          : 'Not enough data'}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs font-medium text-app-text-muted">Snapshots</Text>
                      <Text className="mt-1 text-sm font-semibold text-app-text">
                        {appleSnapshots.length}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs font-medium text-app-text-muted">Sample count</Text>
                      <Text className="mt-1 text-sm font-semibold text-app-text">
                        {appleResult?.metadata?.sampleCount ?? appleSnapshots.length}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs font-medium text-app-text-muted">Accuracy</Text>
                      <Text className="mt-1 text-sm font-semibold text-app-text">
                        {appleResult?.metadata?.trainingAccuracy != null
                          ? `${Math.round(appleResult.metadata.trainingAccuracy * 100)}%`
                          : appleHasResult
                            ? '—'
                            : 'Pending'}
                      </Text>
                    </View>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-1"
                      title="Retrain"
                      onPress={handleRetrain}
                      disabled={appleLoading || !appleSnapshots.length}
                      loading={appleLoading}
                    />
                  </View>

                  {appleError && (
                    <View className="mt-5 rounded-2xl border border-error-200 bg-error-50 px-4 py-3">
                      <Text className="text-xs font-medium text-error-700">{appleError}</Text>
                    </View>
                  )}

                  {appleLoading && !appleError && (
                    <View className="mt-5 flex-row items-center rounded-2xl bg-app-surface-alt px-4 py-3">
                      <ActivityIndicator size="small" color="#0EA5E9" />
                      <Text className="ml-2 text-xs text-app-text-muted">Training on-device…</Text>
                    </View>
                  )}
                </View>

                {/*<View className="rounded-3xl border border-app-border bg-app-surface px-4 py-5 shadow-sm">
                  <View className="mb-4 flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-app-text">
                      Latest category status
                    </Text>
                    {appleLatestMonth && (
                      <Text className="text-xs font-medium text-app-text-muted">
                        {formatMonthLabel(appleLatestMonth)}
                      </Text>
                    )}
                  </View>

                  {classificationList.length === 0 && !appleLoading ? (
                    <View className="rounded-2xl border border-dashed border-app-border bg-app-surface-alt px-4 py-3">
                      <Text className="text-xs text-app-text-muted">
                        Train the coach with more budget history to see per-category
                        classifications.
                      </Text>
                    </View>
                  ) : (
                    classificationList.map((item) => {
                      const snapshotKey = `${item.categoryId}:${item.month}`;
                      const snapshot = appleSnapshotMap.get(snapshotKey);
                      const budgetValue = snapshot?.budget ?? 0;
                      const spentValue = snapshot?.spent ?? 0;
                      const varianceValue = item.variance ?? 0;
                      const varianceLabel = `${varianceValue >= 0 ? '+' : ''}${currencyFormatter.format(varianceValue)}`;
                      const predictedStyles = getStatusStyles(item.predictedStatus);
                      const actualStyles = getStatusStyles(item.actualStatus);
                      const icon = (item.metadata as any)?.icon ?? snapshot?.metadata?.icon;
                      const confidencePercent = Math.round((item.confidence ?? 0) * 100);

                      return (
                        <View
                          key={`${item.categoryId}-${item.month}`}
                          className="mb-3 rounded-2xl border border-app-border bg-app-surface-alt px-4 py-3">
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-2">
                              {icon ? <Text className="text-lg leading-none">{icon}</Text> : null}
                              <Text className="text-sm font-semibold text-app-text">
                                {item.categoryName}
                              </Text>
                            </View>
                            <View className={`rounded-full px-3 py-1 ${predictedStyles.bg}`}>
                              <Text className={`text-xs font-semibold ${predictedStyles.text}`}>
                                {predictedStyles.label}
                              </Text>
                            </View>
                          </View>

                          <Text className="mt-3 text-xs text-app-text-muted">
                            Spent {currencyFormatter.format(spentValue)} of{' '}
                            {currencyFormatter.format(budgetValue)} · Variance {varianceLabel} ·
                            Confidence {confidencePercent}%
                          </Text>

                          {item.actualStatus !== item.predictedStatus && (
                            <View
                              className={`mt-2 inline-flex rounded-full px-2 py-1 ${actualStyles.bg}`}>
                              <Text className={`text-[10px] font-semibold ${actualStyles.text}`}>
                                Actual: {actualStyles.label}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>

                <View className="mt-4 rounded-3xl border border-app-border bg-app-surface px-4 py-5 shadow-sm">
                  <View className="mb-4 flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-app-text">
                      Suggested adjustments
                    </Text>
                    {appleLatestMonth && (
                      <Text className="text-xs font-medium text-app-text-muted">
                        {formatMonthLabel(appleLatestMonth)}
                      </Text>
                    )}
                  </View>

                  {recommendations.length === 0 ? (
                    <View className="rounded-2xl border border-dashed border-app-border bg-app-surface-alt px-4 py-3">
                      <Text className="text-xs text-app-text-muted">
                        Retrain after capturing more budget activity to unlock tailored
                        recommendations.
                      </Text>
                    </View>
                  ) : (
                    recommendations.slice(0, 5).map((rec) => {
                      const classification =
                        rec.categoryId != null
                          ? classificationByCategoryId.get(rec.categoryId)
                          : undefined;
                      const snapshot =
                        rec.categoryId != null
                          ? appleSnapshotMap.get(
                              `${rec.categoryId}:${classification?.month ?? appleLatestMonth ?? ''}`
                            )
                          : undefined;
                      const spentValue = snapshot?.spent ?? 0;
                      const budgetValue = snapshot?.budget ?? 0;
                      const scoreLabel = Number.isFinite(rec.score) ? rec.score.toFixed(2) : '—';
                      const guidance = buildRecommendationCopy(classification, snapshot);

                      return (
                        <View
                          key={`${rec.categoryName}-${rec.categoryId ?? 'unknown'}`}
                          className="mb-3 rounded-2xl border border-app-border bg-app-surface-alt px-4 py-3">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm font-semibold text-app-text">
                              {rec.categoryName}
                            </Text>
                            <Text className="text-xs font-semibold text-app-text-muted">
                              Score {scoreLabel}
                            </Text>
                          </View>
                          <Text className="mt-2 text-xs text-app-text-muted">
                            Spent {currencyFormatter.format(spentValue)} of{' '}
                            {currencyFormatter.format(budgetValue)}. {guidance}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>*/}
                <View className="my-6 rounded-3xl border border-app-border bg-app-surface px-4 py-5 shadow-sm">
                  <View className="mb-4 flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-app-text">
                      Apple budget Q&amp;A
                    </Text>
                    {appleChatLoading && Platform.OS === 'ios' && (
                      <View className="flex-row items-center rounded-full bg-app-surface-alt px-3 py-1">
                        <ActivityIndicator size="small" color="#0EA5E9" />
                        <Text className="ml-2 text-xs font-medium text-app-text-muted">
                          Thinking…
                        </Text>
                      </View>
                    )}
                  </View>

                  {Platform.OS !== 'ios' ? (
                    <View className="rounded-2xl border border-dashed border-app-border bg-app-surface-alt px-4 py-3">
                      <Text className="text-xs text-app-text-muted">
                        Apple budget chat is only available on iOS devices.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <ScrollView
                        ref={(ref) => {
                          appleChatScrollRef.current = ref;
                        }}
                        className="max-h-80"
                        contentContainerStyle={{ paddingBottom: 16 }}
                        keyboardShouldPersistTaps="handled"
                        onContentSizeChange={() =>
                          appleChatScrollRef.current?.scrollToEnd({ animated: true })
                        }>
                        {appleChatMessages
                          .filter((message) => message.role !== 'system')
                          .map((message, index) => {
                            const baseClasses =
                              message.role === 'user'
                                ? 'self-end bg-primary-500'
                                : message.role === 'tool'
                                  ? 'self-start border border-dashed border-app-border bg-app-surface'
                                  : 'self-start border border-app-border bg-app-surface-alt';
                            const textClasses =
                              message.role === 'user'
                                ? 'text-white'
                                : message.role === 'tool'
                                  ? 'text-xs text-app-text-muted'
                                  : 'text-sm text-app-text';
                            return (
                              <View
                                key={`apple-chat-${index}-${message.role}`}
                                className={`mt-2 max-w-[85%] rounded-3xl px-4 py-3 shadow-sm ${baseClasses}`}>
                                <Text className={textClasses}>{message.content}</Text>
                              </View>
                            );
                          })}
                      </ScrollView>

                      {appleChatError && (
                        <View className="mt-3 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-2">
                          <Text className="text-xs font-medium text-warning-700">
                            {appleChatError}
                          </Text>
                        </View>
                      )}

                      <View className="mt-4 flex-row items-end rounded-2xl border border-app-border bg-app-surface-alt px-3 py-2">
                        <TextInput
                          value={appleChatInput}
                          onChangeText={setAppleChatInput}
                          placeholder="Ask the Apple advisor…"
                          placeholderTextColor="#64748B"
                          className="max-h-32 flex-1 text-sm text-app-text"
                          multiline
                          editable={!appleChatLoading}
                          returnKeyType="send"
                          onSubmitEditing={() => {
                            if (!appleChatLoading) handleAppleChatSubmit();
                          }}
                        />
                        <TouchableOpacity
                          onPress={handleAppleChatSubmit}
                          disabled={appleChatLoading || !appleChatInput.trim()}
                          accessibilityLabel="Send Apple advisor question"
                          className={`ml-2 h-9 w-9 items-center justify-center rounded-full bg-primary-500 ${
                            appleChatLoading || !appleChatInput.trim() ? 'opacity-40' : ''
                          }`}>
                          {appleChatLoading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Ionicons name="send" size={18} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

export default InsightsTab;
