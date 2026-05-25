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
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

import { TopUtilityBar } from '@/components/TopUtilityBar';
import { useAuth } from '@/context/useAuth';
import { useAppData } from '../_layout';
import { Card, CardContent } from '@/components/Card';
import { PillSegmentedControl } from '@/components/PillSegmentedControl';
import { SectionHeaderRow } from '@/components/SectionHeaderRow';
import { useVectorStore } from '@/context/RAGContext';
import { useRAG } from 'react-native-rag';
import { AppText } from '@/components/AppText';
import type { Transaction, Category, CategoryBreakdown, Insight } from '@/context/DataContext';
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
  const [insightsMode, setInsightsMode] = useState<'assistant' | 'apple'>('apple');
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
        const documents: { pageContent: string; metadata: Record<string, unknown> }[] = [];

        if (transactions?.length) {
          const now = new Date();
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          const recent = transactions
            .filter((tx: Transaction) => new Date(tx.date) >= ninetyDaysAgo)
            .slice(-500);

          recent.forEach((tx: Transaction) => {
            const category = categories?.find((cat: Category) => cat.id === tx.categoryId);
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
          insights.forEach((insight: Insight) => {
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
  const appleHeroTitle = appleLoading
    ? 'Training your budget coach'
    : appleError
      ? 'Check your budget data'
      : appleHasResult
        ? 'Apple budget coach ready'
        : 'Apple budget coach';
  const appleHeroSubtitle = appleLoading
    ? 'Crunching your recent budgets securely on-device.'
    : appleError
      ? appleError
      : appleHasResult
        ? 'Your private on-device coach is ready with budget signals and next actions.'
        : 'Run the coach on your recent budgets whenever you want a fresh local read.';

  const heroTitle = isAssistantMode ? assistantHeroTitle : appleHeroTitle;
  const heroSubtitle = isAssistantMode ? assistantHeroSubtitle : appleHeroSubtitle;
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      style={{ flex: 1 }}>
      <View className="flex-1 bg-app-canvas">
        <TopUtilityBar
          badge="Insights"
          actionIcon="sparkles-outline"
          actionLabel="Retrain coach"
          onPressAction={handleRetrain}
        />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingTop: 20,
            paddingBottom: insets.bottom + 120,
          }}
          contentContainerClassName="px-5"
          keyboardShouldPersistTaps="handled">
          <Text className="mb-6 text-sm leading-6 text-app-text-faint">
            Analytics and coaching in one premium view.
          </Text>

          <PillSegmentedControl
            value={insightsMode}
            onChange={(value) => setInsightsMode(value)}
            options={[
              { label: 'Coach', value: 'apple' },
              { label: 'Assistant', value: 'assistant' },
            ]}
          />

          <Card variant="hero" className="mt-5">
            <CardContent>
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-xs uppercase tracking-[0.12em] text-app-text-faint">
                    Reports overview
                  </Text>
                  <Text className="mt-3 text-3xl font-semibold text-app-text-strong">
                    {heroTitle}
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-app-text-faint">{heroSubtitle}</Text>
                </View>
                <View className="rounded-full border border-app-border-contrast bg-app-surface-1 px-3 py-1.5">
                  <Text className="text-xs font-medium text-accent-savings">{statusLabel}</Text>
                </View>
              </View>

              <View className="mt-5 flex-row gap-3">
                <InsightStat
                  label="Net income"
                  value={currencyFormatter.format(summary?.netIncomeAfterSavings ?? 0)}
                />
                <InsightStat
                  label="Expenses"
                  value={currencyFormatter.format(summary?.totalExpenses ?? 0)}
                />
              </View>
            </CardContent>
          </Card>

          <View className="mt-5 flex-row gap-3">
            {['1W', '1M', '1Y', 'YTD', 'ALL'].map((label) => (
              <View
                key={label}
                className="rounded-full border border-app-border bg-app-surface-1 px-3 py-2">
                <Text className="text-xs font-medium text-app-text-faint">{label}</Text>
              </View>
            ))}
          </View>

          <View className="mt-8">
            <SectionHeaderRow title="Signals" subtitle="The numbers worth attention right now" />
            <View className="gap-3">
              <InsightPanel
                title="Budget pressure"
                value={currencyFormatter.format(summary?.remainingBudget ?? 0)}
                detail="Remaining budget"
              />
              <InsightPanel
                title="Savings progress"
                value={currencyFormatter.format(summary?.totalSavingsProgress ?? 0)}
                detail={`Planned ${currencyFormatter.format(summary?.totalSavingsPlanned ?? 0)}`}
              />
            </View>
          </View>

          {isAssistantMode ? (
            <View className="mt-8">
              <SectionHeaderRow
                title="Local assistant"
                subtitle="Ask grounded questions about your current transactions and budgets"
                actionLabel="Use prompt"
                onPressAction={quickPrompt}
              />

              <Card variant="glass-dark">
                <CardContent>
                  {isSetupPending || isAssistantLoading ? (
                    <View className="rounded-2xl bg-app-canvas-elevated px-4 py-4">
                      <Text className="text-sm font-medium text-app-text-soft">
                        {assistantSetupPending
                          ? `Embeddings ${embeddingsPercent}% • LLM ${llmPercent}%`
                          : 'Analyzing your financial data…'}
                      </Text>
                    </View>
                  ) : null}

                  <ScrollView
                    ref={(ref) => {
                      messagesScrollRef.current = ref;
                    }}
                    className="mt-4 max-h-[360px]"
                    contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
                    onContentSizeChange={() =>
                      messagesScrollRef.current?.scrollToEnd({ animated: true })
                    }>
                    {messages
                      .filter((message) => message.role !== 'system')
                      .map((message, index) => (
                        <View
                          key={`assistant-${index}-${message.role}`}
                          className={`max-w-[88%] rounded-3xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'self-end bg-app-surface-3'
                              : 'self-start border border-app-border bg-app-surface-1'
                          }`}>
                          <Text
                            className={`text-sm leading-6 ${
                              message.role === 'user'
                                ? 'text-app-text-strong'
                                : 'text-app-text-soft'
                            }`}>
                            {message.content}
                          </Text>
                        </View>
                      ))}
                  </ScrollView>

                  <View className="mt-4 flex-row items-end rounded-2xl border border-app-border bg-app-canvas-elevated px-3 py-2">
                    <TextInput
                      ref={inputRef}
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Ask about spending, categories, or progress"
                      placeholderTextColor="#8190B3"
                      className="max-h-32 flex-1 text-sm text-app-text-strong"
                      editable={!isLoading}
                      returnKeyType="send"
                      onSubmitEditing={() => {
                        if (!isLoading) handleSubmitQuery();
                      }}
                    />
                    <TouchableOpacity
                      onPress={handleSubmitQuery}
                      disabled={isLoading || !query.trim()}
                      className={`ml-2 h-10 w-10 items-center justify-center rounded-full bg-accent-savings ${
                        isLoading || !query.trim() ? 'opacity-40' : ''
                      }`}>
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#050816" />
                      ) : (
                        <Ionicons name="send" size={18} color="#050816" />
                      )}
                    </TouchableOpacity>
                  </View>
                </CardContent>
              </Card>
            </View>
          ) : (
            <>
              <View className="mt-8">
                <SectionHeaderRow
                  title="Coach actions"
                  subtitle={
                    appleLatestMonth ? formatMonthLabel(appleLatestMonth) : 'Latest model state'
                  }
                  actionLabel="Retrain"
                  onPressAction={handleRetrain}
                />
                <View className="gap-3">
                  {classificationList.slice(0, 4).map((entry) => {
                    const snapshot = appleSnapshotMap.get(`${entry.categoryId}:${entry.month}`);
                    const statusStyles = getStatusStyles(entry.predictedStatus);
                    return (
                      <Card key={`${entry.categoryId}-${entry.month}`} variant="glass-dark">
                        <CardContent>
                          <View className="flex-row items-start justify-between gap-4">
                            <View className="flex-1">
                              <Text className="text-base font-semibold text-app-text-strong">
                                {entry.categoryName}
                              </Text>
                              <Text className="mt-2 text-sm leading-6 text-app-text-faint">
                                {buildRecommendationCopy(entry, snapshot)}
                              </Text>
                            </View>
                            <View className="rounded-full bg-app-canvas-elevated px-3 py-1.5">
                              <Text className={`text-xs font-medium ${statusStyles.text}`}>
                                {statusStyles.label}
                              </Text>
                            </View>
                          </View>
                        </CardContent>
                      </Card>
                    );
                  })}
                </View>
              </View>

              <View className="mt-8">
                <SectionHeaderRow title="Recommended actions" subtitle="Model-driven next moves" />
                <View className="gap-3">
                  {recommendations.length ? (
                    recommendations.slice(0, 4).map((recommendation, index) => (
                      <Card key={`${recommendation.categoryId ?? index}-${index}`} variant="inset">
                        <CardContent>
                          <Text className="text-sm leading-6 text-app-text-soft">
                            Consider revisiting {recommendation.categoryName}.
                          </Text>
                          {Number.isFinite(recommendation.score) ? (
                            <Text className="mt-2 text-xs leading-5 text-app-text-faint">
                              Recommendation score {recommendation.score.toFixed(2)}
                            </Text>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card variant="inset">
                      <CardContent>
                        <Text className="text-sm text-app-text-faint">
                          Train the coach on recent budget snapshots to surface actions here.
                        </Text>
                      </CardContent>
                    </Card>
                  )}
                </View>
              </View>

              <View className="mt-8">
                <SectionHeaderRow
                  title="Coach chat"
                  subtitle="Ask Apple’s on-device budget advisor"
                />
                <Card variant="glass-dark">
                  <CardContent>
                    {Platform.OS !== 'ios' ? (
                      <View className="rounded-2xl border border-dashed border-app-border bg-app-canvas-elevated px-4 py-3">
                        <Text className="text-xs text-app-text-faint">
                          Apple budget chat is only available on iOS devices.
                        </Text>
                      </View>
                    ) : (
                      <>
                        <ScrollView
                          ref={(ref) => {
                            appleChatScrollRef.current = ref;
                          }}
                          className="max-h-[360px]"
                          contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
                          keyboardShouldPersistTaps="handled"
                          onContentSizeChange={() =>
                            appleChatScrollRef.current?.scrollToEnd({ animated: true })
                          }>
                          {appleChatMessages
                            .filter((message) => message.role !== 'system')
                            .map((message, index) => (
                              <View
                                key={`apple-chat-${index}-${message.role}`}
                                className={`max-w-[88%] rounded-3xl px-4 py-3 ${
                                  message.role === 'user'
                                    ? 'self-end bg-app-surface-3'
                                    : 'self-start border border-app-border bg-app-surface-1'
                                }`}>
                                {message.role === 'user' ? (
                                  <Text className="text-sm leading-6 text-app-text-strong">
                                    {message.content}
                                  </Text>
                                ) : (
                                  <Markdown>{message.content}</Markdown>
                                )}
                              </View>
                            ))}
                        </ScrollView>

                        {appleChatError ? (
                          <View className="mt-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 px-4 py-2">
                            <Text className="text-xs font-medium text-warning-700">
                              {appleChatError}
                            </Text>
                          </View>
                        ) : null}
                      </>
                    )}
                  </CardContent>
                </Card>
              </View>
            </>
          )}
        </ScrollView>

        {Platform.OS === 'ios' && !isAssistantMode ? (
          <View className="px-5 pt-3" style={{ paddingBottom: insets.bottom + 60 }}>
            <View className="flex-row items-end rounded-2xl border border-app-border bg-app-surface-1 px-3 py-2">
              <TextInput
                value={appleChatInput}
                onChangeText={setAppleChatInput}
                placeholder="Ask the Apple advisor…"
                placeholderTextColor="#8190B3"
                className="max-h-32 flex-1 text-sm text-app-text-strong"
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
                className={`ml-2 h-10 w-10 items-center justify-center rounded-full bg-accent-savings ${
                  appleChatLoading || !appleChatInput.trim() ? 'opacity-40' : ''
                }`}>
                {appleChatLoading ? (
                  <ActivityIndicator size="small" color="#050816" />
                ) : (
                  <Ionicons name="send" size={18} color="#050816" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function InsightStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-app-canvas-elevated px-3 py-4">
      <AppText variant="label-xs" className="text-app-text-faint">{label}</AppText>
      <AppText variant="metric-lg" className="mt-2 text-app-text-strong">{value}</AppText>
    </View>
  );
}

function InsightPanel({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card variant="glass-dark">
      <CardContent>
      <AppText variant="form-label" className="text-app-text-faint">{title}</AppText>
      <AppText variant="hero" className="mt-2 text-2xl text-app-text-strong">{value}</AppText>
      <AppText variant="hint" className="mt-2 text-app-text-soft">{detail}</AppText>
      </CardContent>
    </Card>
  );
}

export default InsightsTab;
