import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useVectorStore } from '../../context/RAGContext';
import { useIsFocused } from '@react-navigation/native';
import { useAppData } from '../_layout';
import { Ionicons } from '@expo/vector-icons';
// Chat-focused screen
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/useAuth';
import type {
  Transaction,
  Category,
  DashboardSummary,
  CategoryBreakdown,
} from '../../context/DataContext';
import { useRAG } from 'react-native-rag';

function InsightsTab() {
  const { vectorStore, llm, embeddingsProgress, llmProgress, embeddingsInstalled, llmInstalled } =
    useVectorStore();
  const isFocused = useIsFocused();
  const { summary, insights, user, transactions, categories, summaryLoading, insightsLoading } =
    useAppData();
  const { username: authUsername } = useAuth();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant' | 'system'; content: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const messagesScrollRef = useRef<ScrollView | null>(null);
  const liveAssistantIndexRef = useRef<number | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);

  // Defer loading RAG until both vector store and LLM exist to avoid an initial load error
  const rag = useRAG({
    // react-native-rag expects non-null instances; we prevent load until both are ready
    vectorStore: vectorStore as any,
    llm: llm as any,
    preventLoad: !vectorStore || !llm || !isFocused,
  });

  // If leaving the screen mid-generation, try to interrupt to free memory sooner
  useEffect(() => {
    if (!isFocused && rag.isGenerating) {
      rag.interrupt().catch(() => {});
    }
  }, [isFocused, rag.isGenerating]);

  // Initialize conversation and load data into vector store
  useEffect(() => {
    if (!rag.isReady || !transactions || !categories || !summary || dataLoaded) return;
    console.log('Vector Store: ', vectorStore);
    const loadFinancialData = async () => {
      try {
        setIsLoading(true);

        // Create documents from your financial data
        const documents = [];
        // Transaction documents (limit to last 90 days and cap total count)
        if (transactions && transactions.length > 0) {
          const now = new Date();
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          const recent = transactions
            .filter((tx: Transaction) => new Date(tx.date) >= ninetyDaysAgo)
            .slice(-500); // hard cap

          recent.forEach((tx: Transaction) => {
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

        // Category documents with budget information
        if (categories && categories.length > 0) {
          categories.forEach((cat: Category) => {
            documents.push({
              pageContent: `Category: ${cat.name} with monthly budget of $${cat.budget}. Icon: ${cat.icon}, Color: ${cat.color}`,
              metadata: { type: 'category', id: cat.id.toString(), name: cat.name },
            });
          });
        }

        // Summary documents
        if (summary) {
          documents.push({
            pageContent:
              `Financial Summary: Total income baseline $${summary.incomeBaseline || summary.totalIncome}, Total expenses $${summary.totalExpenses}, Total budget $${summary.totalBudget}, Remaining budget $${summary.remainingBudget}`.slice(
                0,
                280
              ),
            metadata: { type: 'summary' },
          });

          // Category breakdown from summary
          if (summary.categoryBreakdown) {
            summary.categoryBreakdown.forEach((breakdown: CategoryBreakdown) => {
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
        }

        // Insights documents
        if (insights && insights.length > 0) {
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

        // Add documents to vector store
        if (documents.length > 0) {
          console.log('Adding documents to vector store...');
          for (const doc of documents) {
            try {
              await rag.addDocument(doc.pageContent, doc.metadata);
            } catch (e) {
              console.warn('Add doc failed:', e);
            }
          }
        }

        setDataLoaded(true);

        // Add initial message
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
  }, [rag.isReady, transactions, categories, summary, insights, user, authUsername, dataLoaded]);

  // Removed Smart Insights to focus on chat

  // Handle user query submission
  const handleSubmitQuery = async () => {
    if (!query.trim() || !vectorStore) return;

    try {
      setIsLoading(true);

      // Add user message
      const userMessage = { role: 'user' as const, content: query };
      setMessages((prev) => [...prev, userMessage]);
      setQuery('');

      // Prepare chat history for RAG
      const history = [
        {
          role: 'system' as const,
          content:
            "You are a helpful personal finance assistant running on-device. Answer using only the provided context from the user's transactions, categories, and budget summary. Prefer the current month unless the user specifies a timeframe. Show currency as $X,XXX.XX. Be concise and actionable.",
        },
        ...messages,
        userMessage,
      ];

      // Streaming placeholder; track index for live updates
      setMessages((prev) => {
        const idx = prev.length;
        liveAssistantIndexRef.current = idx;
        return [...prev, { role: 'assistant', content: '' }];
      });

      // Generate with RAG augmentation
      const response = await rag.generate(history, {
        augmentedGeneration: true,
        k: 3,
        // Optional: custom prompt formatting
        promptGenerator: (msgs, retrieved) => {
          const last = msgs[msgs.length - 1];
          const ctx = retrieved.map((d, i) => `#${i + 1}: ${d.content}`).join('\n');
          return `User question: ${last?.content}\nContext (most relevant first):\n${ctx}\nGuidelines: Use only the context. If unclear, ask a brief follow-up.`;
        },
      });

      // Ensure final text is set (in case last token callback missed)
      setMessages((prev) => {
        const next = [...prev];
        const idx = liveAssistantIndexRef.current;
        if (idx != null && next[idx]) {
          next[idx] = { role: 'assistant', content: response };
        }
        return next;
      });

      // Auto-continue if response looks cut off and not already continuing
      if (!isContinuing && looksTruncated(response)) {
        setIsContinuing(true);
        const idx = liveAssistantIndexRef.current;
        try {
          const contHistory = [
            {
              role: 'system' as const,
              content:
                'Continue the previous answer. Do not repeat previous lines. Finish the list or sentence succinctly.',
            },
            ...messages,
            userMessage,
            { role: 'assistant' as const, content: response },
            { role: 'user' as const, content: 'Continue.' },
          ];

          // Stream into the same assistant message
          const cont = await rag.generate(contHistory, {
            augmentedGeneration: false,
          });

          setMessages((prev) => {
            const next = [...prev];
            if (idx != null && next[idx]) {
              next[idx] = {
                role: 'assistant',
                content: (next[idx] as any).content + '\n' + cont,
              } as any;
            }
            return next;
          });
        } catch (e) {
          // no-op; better partial answer than failure
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
  };

  // Live streaming: update the last assistant placeholder as tokens arrive
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

  function looksTruncated(text: string) {
    if (!text) return false;
    const trimmed = text.trim();
    // Ends without sentence punctuation and is reasonably long
    const endsClean = /[.!?]$/.test(trimmed);
    if (!endsClean && trimmed.length > 120) return true;
    // Ends with dangling number/bullet
    if (/\n\s*\d+\.$/.test(trimmed)) return true;
    // Ends with a dangling comma/colon
    if (/[,:;-]$/.test(trimmed) && trimmed.length > 80) return true;
    return false;
  }

  // Enhanced response generation based on query patterns
  const generateResponse = async (query: string, context: string) => {
    const lowerQuery = query.toLowerCase();

    // Spending queries
    if (lowerQuery.includes('spend') || lowerQuery.includes('spent')) {
      if (lowerQuery.includes('month') || lowerQuery.includes('monthly')) {
        return `Based on your transaction data, you've spent $${summary?.totalExpenses?.toFixed(2) || 0} this month across all categories.`;
      }

      // Check for specific category mentions
      const mentionedCategory = categories?.find((cat) =>
        lowerQuery.includes(cat.name.toLowerCase())
      );

      if (mentionedCategory && summary?.categoryBreakdown) {
        const categoryBreakdown = summary.categoryBreakdown.find(
          (cb) => cb.id === mentionedCategory.id
        );
        if (categoryBreakdown) {
          return `You've spent $${categoryBreakdown.spent.toFixed(2)} on ${categoryBreakdown.name} this month, which is ${categoryBreakdown.percentage.toFixed(0)}% of your $${categoryBreakdown.budget.toFixed(2)} budget for this category.`;
        }
      }
    }

    // Budget queries
    if (lowerQuery.includes('budget')) {
      if (lowerQuery.includes('remaining') || lowerQuery.includes('left')) {
        return `You have $${summary?.remainingBudget?.toFixed(2) || 0} remaining in your budget this month.`;
      }

      if (lowerQuery.includes('track') || lowerQuery.includes('on track')) {
        const budgetUsedPercentage =
          summary?.totalBudget > 0 ? (summary.totalExpenses / summary.totalBudget) * 100 : 0;
        const isOnTrack = budgetUsedPercentage <= 75;
        return `${isOnTrack ? "Yes, you're on track!" : 'You might want to watch your spending.'} You've used ${budgetUsedPercentage.toFixed(0)}% of your monthly budget.`;
      }

      return `Your total monthly budget is $${summary?.totalBudget?.toFixed(2) || 0}. You've spent $${summary?.totalExpenses?.toFixed(2) || 0} so far, leaving $${summary?.remainingBudget?.toFixed(2) || 0} remaining.`;
    }

    // Income queries
    if (lowerQuery.includes('income') || lowerQuery.includes('earn')) {
      const baseline = summary?.incomeBaseline ?? summary?.totalIncome ?? 0;
      return `Your total income baseline this month is $${baseline.toFixed(2)}. After expenses of $${summary?.totalExpenses?.toFixed(2) || 0}, you have $${(baseline - (summary?.totalExpenses || 0)).toFixed(2)} left.`;
    }

    // Category queries
    if (lowerQuery.includes('category') || lowerQuery.includes('categories')) {
      if (summary?.categoryBreakdown && summary.categoryBreakdown.length > 0) {
        const topCategories = summary.categoryBreakdown
          .sort((a, b) => b.spent - a.spent)
          .slice(0, 3)
          .map((cat) => `${cat.name} ($${cat.spent.toFixed(2)})`)
          .join(', ');
        return `Your top spending categories are: ${topCategories}.`;
      }
    }

    // Savings queries
    if (lowerQuery.includes('save') || lowerQuery.includes('saving')) {
      const baseline = summary?.incomeBaseline ?? summary?.totalIncome ?? 0;
      const savings = baseline - (summary?.totalExpenses || 0);
      const savingsRate = baseline > 0 ? (savings / baseline) * 100 : 0;
      return `You're saving $${savings.toFixed(2)} this month, which is ${savingsRate.toFixed(0)}% of your income.`;
    }

    // Generic response using available context
    if (context && summary) {
      return `Based on your financial data: You have a total budget of $${summary.totalBudget.toFixed(2)}, have spent $${summary.totalExpenses.toFixed(2)}, and have $${summary.remainingBudget.toFixed(2)} remaining. Your top spending categories are ${
        summary.categoryBreakdown
          ?.slice(0, 2)
          .map((cat) => cat.name)
          .join(' and ') || 'not available'
      }. What else would you like to know?`;
    }

    return "I'd be happy to help you understand your finances better! Try asking about your spending, budget, income, or specific categories.";
  };

  // Show setup progress while local assistant is loading
  if (!rag.isReady || !vectorStore || !llm) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Setting up Local Assistant</Text>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingTitle}>Downloading models</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Embeddings</Text>
            <Text style={styles.progressValue}>
              {embeddingsInstalled
                ? 'Installed'
                : `${Math.round((embeddingsProgress || 0) * 100)}%`}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(((embeddingsInstalled ? 1 : embeddingsProgress) || 0) * 100)}%`,
                },
              ]}
            />
          </View>
          <View style={[styles.progressRow, { marginTop: 12 }]}>
            <Text style={styles.progressLabel}>LLM</Text>
            <Text style={styles.progressValue}>
              {llmInstalled ? 'Installed' : `${Math.round((llmProgress || 0) * 100)}%`}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(((llmInstalled ? 1 : llmProgress) || 0) * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.loadingHint}>
            Runs on-device. First-time setup may take a minute.
          </Text>
        </View>
      </View>
    );
  }

  // Show loading state while data is being fetched
  if (summaryLoading || insightsLoading || (!dataLoaded && isLoading)) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Ask About Your Finances</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Analyzing your financial data...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 82 : 0}
      style={{ flex: 1 }}>
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) + 72 }]}>
        {/* Smart Insights removed to focus on AI chat */}

        {/* Generated Insights from Backend */}
        {false && insights && insights.length > 0 && (
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>System Insights</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {insights.map((insight, index) => (
                <View key={index} style={styles.insightCard}>
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor:
                          insight.severity === 'error'
                            ? '#f44336'
                            : insight.severity === 'warning'
                              ? '#ff9800'
                              : '#4caf50',
                      },
                    ]}>
                    <Ionicons
                      name={
                        insight.type === 'alert'
                          ? 'alert-circle'
                          : insight.type === 'suggestion'
                            ? 'bulb'
                            : 'trending-up'
                      }
                      size={24}
                      color="white"
                    />
                  </View>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightContent}>{insight.description}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Chat Interface */}
        <View style={styles.chatContainer}>
          <Text style={styles.sectionTitle}>Financial AI Assistant</Text>

          <ScrollView
            ref={(r) => (messagesScrollRef.current = r)}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => messagesScrollRef.current?.scrollToEnd({ animated: true })}>
            {messages
              .filter((m) => m.role !== 'system')
              .map((message, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageContainer,
                    message.role === 'user' ? styles.userMessage : styles.aiMessage,
                  ]}>
                  <Text
                    style={[
                      styles.messageText,
                      message.role === 'user' ? styles.userMessageText : styles.aiMessageText,
                    ]}>
                    {message.content}
                  </Text>
                </View>
              ))}
            {isLoading && (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#6B7280" />
                <Text style={styles.typingText}>Thinking…</Text>
              </View>
            )}
          </ScrollView>

          <SafeAreaView edges={['bottom']}>
            <View style={[styles.inputContainer, { marginBottom: Math.max(insets.bottom, 8) }]}>
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                placeholder="Ask about your finances..."
                multiline
                maxLength={200}
                returnKeyType="send"
                onSubmitEditing={handleSubmitQuery}
              />
              <TouchableOpacity
                style={[styles.sendButton, !query.trim() && styles.disabledButton]}
                onPress={handleSubmitQuery}
                disabled={!query.trim() || isLoading}>
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
        {/* Close outer container view before floating FAB */}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#111827' },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  loadingTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: '#6B7280', fontSize: 13 },
  progressValue: { color: '#111827', fontSize: 13, fontWeight: '600' },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: { height: 8, backgroundColor: '#0EA5E9' },
  loadingHint: { marginTop: 12, color: '#6B7280', fontSize: 12 },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    marginBottom: 12,
  },
  messagesContent: {
    paddingBottom: 10,
  },
  messageContainer: {
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    maxWidth: '85%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: '#333',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 18,
    marginBottom: 12,
  },
  typingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#B0C4DE',
  },
});

export default InsightsTab;
