import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TopUtilityBar } from '@/components/TopUtilityBar';
import { AppText } from '@/components/AppText';
import { InsightsComposer } from '@/components/insights/insights-composer';
import { InsightsMessageBubble } from '@/components/insights/insights-message-bubble';
import { InsightsPromptChips } from '@/components/insights/insights-prompt-chips';
import {
  InsightsSignalStrip,
  type InsightsSignalItem,
} from '@/components/insights/insights-signal-strip';
import { InsightsStatusCard } from '@/components/insights/insights-status-card';
import {
  type CategoryBreakdown,
  type Insight,
  type InsightsMessage,
  useData,
} from '@/context/DataContext';
import { useAuth } from '@/context/useAuth';
import { useVectorStore } from '@/context/RAGContext';
import { useAppData } from '../_layout';
import {
  buildBudgetSnapshots,
  trainBudgetInsights,
  type BudgetClassification,
  type BudgetInsightsPayload,
  type BudgetRecommendation,
  type BudgetSnapshot,
} from '@/lib/ai/appleBudgetAdvisor';
import { buildBudgetAssistantContext } from '@/lib/ai/insightsAssistantContext';
import { routeInsightsIntent } from '@/lib/ai/insightsIntentRouter';
import { runAppleBudgetChat, type AppleChatMessage } from '@/lib/ai/appleBudgetChat';
import { useRAG } from 'react-native-rag';

const COMPOSER_SPACE = 124;

function InsightsTab() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const { username: authUsername } = useAuth();
  const { isInitialized, getInsightsThread, saveInsightsThread } = useData();
  const { summary, insights, user, transactions, categories, summaryLoading, insightsLoading } =
    useAppData();
  const { vectorStore, llm, embeddingsProgress, llmProgress, embeddingsInstalled, llmInstalled } =
    useVectorStore();

  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<InsightsMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [threadHydrated, setThreadHydrated] = useState(false);
  const [appleResult, setAppleResult] = useState<BudgetInsightsPayload | null>(null);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleError, setAppleError] = useState<string | null>(null);
  const [lastAppleHash, setLastAppleHash] = useState<string | null>(null);

  const listRef = useRef<FlatList<InsightsMessage> | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const liveAssistantIdRef = useRef<string | null>(null);
  const messagesRef = useRef<InsightsMessage[]>([]);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rag = useRAG({
    vectorStore: vectorStore as any,
    llm: llm as any,
    preventLoad: !vectorStore || !llm || !isFocused,
  });
  const useAppleVisibleChat = Platform.OS === 'ios';

  const greetingName = useMemo(
    () => authUsername || user?.username || 'there',
    [authUsername, user]
  );

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

  const createMessage = useCallback(
    (
      role: InsightsMessage['role'],
      content: string,
      source: InsightsMessage['source'] = role === 'assistant'
        ? 'rag'
        : role === 'system'
          ? 'system'
          : undefined
    ): InsightsMessage => ({
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      createdAt: new Date().toISOString(),
      source,
    }),
    []
  );

  const looksTruncated = useCallback((text: string) => {
    if (!text) return false;
    const trimmed = text.trim();
    if (!/[.!?]$/.test(trimmed) && trimmed.length > 120) return true;
    if (/\n\s*\d+\.$/.test(trimmed)) return true;
    if (/[,:;-]$/.test(trimmed) && trimmed.length > 80) return true;
    return false;
  }, []);

  const looksMalformed = useCallback((text: string) => {
    if (!text) return false;
    const normalized = text.toLowerCase();
    const repeatedStable = (normalized.match(/spending stable/g) || []).length >= 3;
    const repeatedMonth = (normalized.match(/may 2026/g) || []).length >= 4;

    return (
      /##\d+/.test(text) ||
      /\[unused\d+\]/i.test(text) ||
      /_id\b/i.test(text) ||
      /controlledexceeded/i.test(normalized) ||
      /budget note\s*\d+/i.test(text) ||
      /context\s*\d+/i.test(text) ||
      repeatedStable ||
      repeatedMonth
    );
  }, []);

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

  const appleLatestMonth = useMemo(() => {
    if (!appleResult?.classifications?.length) return null;
    return appleResult.classifications
      .map((entry) => entry.month)
      .sort()
      .pop();
  }, [appleResult]);

  const latestClassifications = useMemo<BudgetClassification[]>(() => {
    if (!appleResult?.classifications?.length || !appleLatestMonth) return [];
    return appleResult.classifications.filter((entry) => entry.month === appleLatestMonth);
  }, [appleResult, appleLatestMonth]);

  const recommendations = useMemo<BudgetRecommendation[]>(
    () => appleResult?.recommendations ?? [],
    [appleResult]
  );

  const budgetAssistantContext = useMemo(
    () =>
      Platform.OS === 'ios'
        ? buildBudgetAssistantContext({
            payload: appleResult,
            latestMonth: appleLatestMonth ?? null,
            latestClassifications,
            recommendations,
            snapshotMap: appleSnapshotMap,
            formatCurrency: (value) => currencyFormatter.format(value),
            formatMonthLabel,
          })
        : { docs: [], summary: null, suggestedPrompts: [] },
    [
      appleLatestMonth,
      appleResult,
      appleSnapshotMap,
      currencyFormatter,
      formatMonthLabel,
      latestClassifications,
      recommendations,
    ]
  );

  const assistantSetupPending = useAppleVisibleChat ? false : !rag.isReady || !vectorStore || !llm;
  const assistantDataLoading = summaryLoading || insightsLoading || (!dataLoaded && isLoading);
  const composerDisabled = assistantSetupPending || assistantDataLoading;

  const assistantContextBlock = useMemo(() => {
    if (!summary) return '';

    const lines: string[] = [];
    lines.push(
      `Financial summary: income baseline ${currencyFormatter.format(summary.incomeBaseline || summary.totalIncome || 0)}, expenses ${currencyFormatter.format(summary.totalExpenses || 0)}, total budget ${currencyFormatter.format(summary.totalBudget || 0)}, remaining budget ${currencyFormatter.format(summary.remainingBudget || 0)}, net income after savings ${currencyFormatter.format(summary.netIncomeAfterSavings || 0)}.`
    );

    const topBreakdown = (summary.categoryBreakdown ?? []).slice(0, 4);
    if (topBreakdown.length) {
      lines.push(
        `Top categories: ${topBreakdown
          .map(
            (entry: CategoryBreakdown) =>
              `${entry.name} spent ${currencyFormatter.format(entry.spent)} of ${currencyFormatter.format(entry.budget)} budget (${entry.percentage}%).`
          )
          .join(' ')}`
      );
    }

    const recentTransactions = (summary.recentTransactions ?? transactions ?? []).slice(0, 5);
    if (recentTransactions.length) {
      lines.push(
        `Recent transactions: ${recentTransactions
          .map(
            (tx: { description: string; amount: string; date: string }) =>
              `${tx.description} ${currencyFormatter.format(Number(tx.amount || 0))} on ${tx.date}.`
          )
          .join(' ')}`
      );
    }

    const currentInsights = (insights ?? []).slice(0, 3);
    if (currentInsights.length) {
      lines.push(
        `Current insights: ${currentInsights
          .map((insight: Insight) => `${insight.title}: ${insight.description}`)
          .join(' ')}`
      );
    }

    if (budgetAssistantContext.docs.length) {
      lines.push(
        `Budget signals: ${budgetAssistantContext.docs.map((doc) => doc.content).join(' ')}`
      );
    }

    return lines.join('\n\n');
  }, [budgetAssistantContext.docs, currencyFormatter, insights, summary, transactions]);

  const signalItems = useMemo<InsightsSignalItem[]>(() => {
    const items: InsightsSignalItem[] = [
      {
        id: 'net-income',
        label: 'Net income',
        value: currencyFormatter.format(summary?.netIncomeAfterSavings ?? 0),
        detail: 'After planned savings',
      },
      {
        id: 'expenses',
        label: 'Expenses',
        value: currencyFormatter.format(summary?.totalExpenses ?? 0),
        detail: 'Current total spending',
      },
      {
        id: 'remaining-budget',
        label: 'Remaining budget',
        value: currencyFormatter.format(summary?.remainingBudget ?? 0),
        detail: 'Available across categories',
        tone: (summary?.remainingBudget ?? 0) < 0 ? 'error' : 'default',
      },
    ];

    if (budgetAssistantContext.summary) {
      items.push({
        id: 'budget-signal',
        label: budgetAssistantContext.summary.title,
        value: budgetAssistantContext.summary.value,
        detail: budgetAssistantContext.summary.detail,
        tone: budgetAssistantContext.summary.tone,
      });
    }

    return items;
  }, [budgetAssistantContext.summary, currencyFormatter, summary]);

  const suggestedPrompts = useMemo(() => {
    const defaults = [
      'Summarize my top three spending categories this month.',
      'Where am I most at risk of going over budget?',
      'What changed in my spending lately?',
      'What is one concrete move I should make this week?',
    ];

    return Array.from(new Set([...budgetAssistantContext.suggestedPrompts, ...defaults])).slice(
      0,
      4
    );
  }, [budgetAssistantContext.suggestedPrompts]);

  const statusCardProps = useMemo(() => {
    if (!assistantSetupPending && !assistantDataLoading && !appleError) return null;

    if (assistantSetupPending) {
      return {
        eyebrow: 'Local assistant',
        title: 'Setting up your private assistant',
        detail: 'Downloading on-device models so your money questions stay local.',
        statusLabel: 'Preparing',
        tone: 'default' as const,
        progressLines: [
          `Embeddings ${Math.round(((embeddingsInstalled ? 1 : embeddingsProgress) || 0) * 100)}%`,
          `LLM ${Math.round(((llmInstalled ? 1 : llmProgress) || 0) * 100)}%`,
        ],
      };
    }

    if (assistantDataLoading) {
      return {
        eyebrow: 'Local assistant',
        title: 'Analyzing your financial data',
        detail: 'Building a compact local context from recent activity before chat opens up.',
        statusLabel: 'Processing',
        tone: 'default' as const,
        progressLines: appleLoading ? ['Refreshing budget signals in the background.'] : [],
      };
    }

    return {
      eyebrow: 'Budget signals',
      title: 'Signals need a refresh',
      detail: appleError ?? 'Budget signals are temporarily unavailable.',
      statusLabel: 'Limited',
      tone: 'warning' as const,
      progressLines: [],
    };
  }, [
    appleError,
    appleLoading,
    assistantDataLoading,
    assistantSetupPending,
    embeddingsInstalled,
    embeddingsProgress,
    llmInstalled,
    llmProgress,
  ]);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    scrollToBottom(messages.length > 1);
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!isInitialized) return;

    let cancelled = false;

    const loadThread = async () => {
      try {
        const storedMessages = await getInsightsThread();
        if (!cancelled) {
          setMessages(
            storedMessages
              .filter((message) => message.role !== 'system')
              .map((message) =>
                message.role === 'assistant' && looksMalformed(message.content)
                  ? {
                      ...message,
                      content:
                        'I had a malformed draft here earlier. Ask again and I will regenerate the answer cleanly.',
                      source: 'seed',
                    }
                  : message
              )
          );
        }
      } finally {
        if (!cancelled) {
          setThreadHydrated(true);
        }
      }
    };

    loadThread();

    return () => {
      cancelled = true;
    };
  }, [getInsightsThread, isInitialized, looksMalformed]);

  useEffect(() => {
    if (!threadHydrated || messages.length > 0) return;

    setMessages([
      createMessage(
        'assistant',
        `Hi ${greetingName}! Ask about spending, budgets, trends, or your next best money move.`,
        'seed'
      ),
    ]);
  }, [createMessage, greetingName, messages.length, threadHydrated]);

  useEffect(() => {
    if (!threadHydrated) return;

    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = setTimeout(() => {
      void saveInsightsThread(messages.filter((message) => message.role !== 'system'));
    }, 220);

    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [messages, saveInsightsThread, threadHydrated]);

  useEffect(() => {
    if (!isFocused && rag.isGenerating) {
      rag.interrupt().catch(() => {});
    }
  }, [isFocused, rag]);

  useEffect(() => {
    if (useAppleVisibleChat) {
      if (!summary || dataLoaded) return;

      setIsLoading(true);
      setDataLoaded(true);
      setIsLoading(false);
      return;
    }

    if (!rag.isReady || !summary || dataLoaded) return;

    setIsLoading(true);
    setDataLoaded(true);
    setIsLoading(false);
  }, [dataLoaded, rag.isReady, summary, useAppleVisibleChat]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setAppleResult(null);
      setAppleError(null);
      setAppleLoading(false);
      setLastAppleHash(null);
      return;
    }

    if (!appleSnapshots.length) {
      setAppleResult(null);
      setAppleError(null);
      setAppleLoading(false);
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
        let message = (error as Error)?.message ?? 'Unable to refresh budget signals.';
        if (nativeCode === 'feature_unavailable' || /Create ML/i.test(message)) {
          message = 'Budget signals are not available on this device configuration.';
        } else if (nativeCode === 'insufficient_samples') {
          message = 'Need more budget history before budget signals can train.';
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
  }, [appleSnapshots, lastAppleHash, snapshotsKey]);

  const handleSubmitQuery = useCallback(
    async (overridePrompt?: string) => {
      const prompt = (overridePrompt ?? query).trim();
      if (
        !prompt ||
        composerDisabled ||
        !summary ||
        !assistantContextBlock ||
        (!useAppleVisibleChat && !llm)
      ) {
        return;
      }

      try {
        setIsLoading(true);

        const currentMessages = messagesRef.current;
        const userMessage = createMessage('user', prompt);
        setQuery('');
        const placeholder = createMessage('assistant', '', 'rag');
        liveAssistantIdRef.current = placeholder.id;

        setMessages((prev) => [...prev, userMessage, placeholder]);

        const routedIntent = routeInsightsIntent({
          prompt,
          summary,
          categories,
          transactions,
          insights,
          latestMonthLabel: appleLatestMonth ? formatMonthLabel(appleLatestMonth) : 'this month',
        });

        if (routedIntent) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === placeholder.id
                ? { ...message, content: routedIntent.response, source: 'system' }
                : message
            )
          );
          return;
        }

        const history = [
          {
            role: 'system' as const,
            content: `You are a helpful personal finance assistant running on-device.

Use only the financial context below.
Prefer the current month unless the user specifies a timeframe.
Show currency as $X,XXX.XX.
Answer in plain language with short sentences or bullets.
Do not repeat raw source text, ids, tags, or context fragments.

Financial context:
${assistantContextBlock}`,
          },
          ...currentMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          {
            role: 'user' as const,
            content: prompt,
          },
        ];

        const response = useAppleVisibleChat
          ? (
              await runAppleBudgetChat({
                prompt: budgetAssistantContext.summary
                  ? `${prompt}\n\nKeep this latest budget signal in mind: ${budgetAssistantContext.summary.detail}`
                  : prompt,
                history: currentMessages
                  .filter(
                    (message): message is InsightsMessage & { role: 'user' | 'assistant' } =>
                      message.role === 'user' || message.role === 'assistant'
                  )
                  .map(
                    (message): AppleChatMessage => ({
                      role: message.role,
                      content: message.content,
                    })
                  ),
                context: {
                  summary,
                  categories,
                  transactions,
                },
              })
            ).response
          : await rag.generate(history, {
              augmentedGeneration: false,
            });

        const finalResponse = looksMalformed(response)
          ? useAppleVisibleChat
            ? (
                await runAppleBudgetChat({
                  prompt: `Answer this again in clean plain language with no ids, no tags, and no repeated fragments:\n\n${prompt}`,
                  history: [],
                  context: {
                    summary,
                    categories,
                    transactions,
                  },
                })
              ).response
            : await rag.generate(
                [
                  {
                    role: 'system' as const,
                    content: `The previous draft was malformed. Answer the user again in clean plain language using only this financial context:

${assistantContextBlock}

Do not include raw context fragments, numbering artifacts, markdown headings, repeated phrases, ids, or bracketed tokens.`,
                  },
                  {
                    role: 'user' as const,
                    content: prompt,
                  },
                ],
                {
                  augmentedGeneration: false,
                }
              )
          : response;

        setMessages((prev) =>
          prev.map((message) =>
            message.id === placeholder.id
              ? { ...message, content: finalResponse, source: 'rag' }
              : message
          )
        );

        if (
          !useAppleVisibleChat &&
          !isContinuing &&
          looksTruncated(finalResponse) &&
          !looksMalformed(finalResponse)
        ) {
          setIsContinuing(true);
          try {
            const continuation = await rag.generate(
              [
                {
                  role: 'system' as const,
                  content:
                    'Continue the previous answer without repeating earlier lines. Finish the thought succinctly.',
                },
                ...currentMessages.map((message) => ({
                  role: message.role,
                  content: message.content,
                })),
                { role: 'user' as const, content: prompt },
                { role: 'assistant' as const, content: finalResponse },
                { role: 'user' as const, content: 'Continue.' },
              ],
              { augmentedGeneration: false }
            );

            setMessages((prev) =>
              prev.map((message) =>
                message.id === placeholder.id
                  ? {
                      ...message,
                      content: `${message.content}\n${continuation}`.trim(),
                    }
                  : message
              )
            );
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
          createMessage(
            'assistant',
            'Sorry, I ran into an issue while processing that request. Please try again.',
            'seed'
          ),
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      assistantContextBlock,
      budgetAssistantContext.summary,
      categories,
      composerDisabled,
      createMessage,
      formatMonthLabel,
      insights,
      isContinuing,
      looksMalformed,
      looksTruncated,
      llm,
      appleLatestMonth,
      query,
      rag,
      summary,
      transactions,
      useAppleVisibleChat,
    ]
  );

  const handlePromptSelect = useCallback(
    (prompt: string) => {
      if (composerDisabled || isLoading) return;
      setQuery(prompt);
      void handleSubmitQuery(prompt);
    },
    [composerDisabled, handleSubmitQuery, isLoading]
  );

  useEffect(() => {
    if (useAppleVisibleChat) return;
    if (!rag.isGenerating) return;
    const liveAssistantId = liveAssistantIdRef.current;
    if (!liveAssistantId) return;

    setMessages((prev) =>
      prev.map((message) =>
        message.id === liveAssistantId ? { ...message, content: rag.response || '' } : message
      )
    );
  }, [rag.isGenerating, rag.response, useAppleVisibleChat]);

  const renderMessage = useCallback(
    ({ item, index }: ListRenderItemInfo<InsightsMessage>) => (
      <InsightsMessageBubble message={item} index={index} />
    ),
    []
  );

  const listHeader = useMemo(
    () => (
      <View className="gap-5 pb-6 pt-5">
        <View className="gap-2">
          <View className="self-start rounded-full border border-app-border-contrast bg-app-surface-1 px-3 py-1.5">
            <View className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full bg-accent-savings" />
            </View>
          </View>
          <View className="gap-2">
            <View>
              <InsightsHeaderText
                title={`Hi ${greetingName}`}
                subtitle="A simpler local money assistant with one conversation, grounded in your latest budget and transaction data."
              />
            </View>
          </View>
        </View>

        {statusCardProps ? <InsightsStatusCard {...statusCardProps} /> : null}

        <InsightsSignalStrip items={signalItems} />
        <InsightsPromptChips prompts={suggestedPrompts} onSelectPrompt={handlePromptSelect} />
      </View>
    ),
    [greetingName, handlePromptSelect, signalItems, statusCardProps, suggestedPrompts]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 0}
      style={{ flex: 1 }}>
      <View className="flex-1 bg-app-canvas">
        <TopUtilityBar badge="Insights" />

        <FlatList
          ref={(ref) => {
            listRef.current = ref;
          }}
          data={messages.filter((message) => message.role !== 'system')}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          ListHeaderComponent={listHeader}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerClassName="px-5"
          contentContainerStyle={{
            paddingBottom: COMPOSER_SPACE + insets.bottom,
          }}
        />

        <View style={{ paddingBottom: insets.bottom + 8 }}>
          <InsightsComposer
            inputRef={inputRef}
            value={query}
            onChangeText={setQuery}
            onSubmit={() => {
              void handleSubmitQuery();
            }}
            disabled={composerDisabled}
            loading={isLoading}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function InsightsHeaderText({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="gap-2">
      <AppText variant="hero" className="text-app-text-strong">
        {title}
      </AppText>
      <AppText variant="body" className="text-app-text-faint">
        {subtitle}
      </AppText>
    </View>
  );
}

export default InsightsTab;
