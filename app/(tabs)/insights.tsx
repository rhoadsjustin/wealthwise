import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useVectorStore } from '../../context/RAGContext';
import { useAppData } from '../_layout';
import { Ionicons } from '@expo/vector-icons';
import type {
  Transaction,
  Category,
  DashboardSummary,
  CategoryBreakdown,
} from '../../context/DataContext';

function InsightsTab() {
  const { vectorStore } = useVectorStore();
  const { summary, insights, user, transactions, categories, summaryLoading, insightsLoading } =
    useAppData();

  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Initialize conversation and load data into vector store
  useEffect(() => {
    if (!vectorStore || !transactions || !categories || !summary || dataLoaded) return;

    const loadFinancialData = async () => {
      try {
        setIsLoading(true);

        // Create documents from your financial data
        const documents = [];

        // Transaction documents
        if (transactions && transactions.length > 0) {
          transactions.forEach((tx: Transaction) => {
            const category = categories?.find((cat) => cat.id === tx.categoryId);
            const categoryName = category?.name || 'Uncategorized';

            documents.push({
              pageContent: `Transaction: ${tx.description} for $${tx.amount} on ${tx.date} in category ${categoryName}. Type: ${tx.type}`,
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
            pageContent: `Financial Summary: Total income $${summary.totalIncome}, Total expenses $${summary.totalExpenses}, Total budget $${summary.totalBudget}, Remaining budget $${summary.remainingBudget}`,
            metadata: { type: 'summary' },
          });

          // Category breakdown from summary
          if (summary.categoryBreakdown) {
            summary.categoryBreakdown.forEach((breakdown: CategoryBreakdown) => {
              documents.push({
                pageContent: `Category breakdown: ${breakdown.name} has budget $${breakdown.budget}, spent $${breakdown.spent}, which is ${breakdown.percentage}% of budget`,
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
              pageContent: `Insight: ${insight.title} - ${insight.description}. Type: ${insight.type}, Severity: ${insight.severity}`,
              metadata: { type: 'insight', insightType: insight.type, severity: insight.severity },
            });
          });
        }

        // Add documents to vector store
        if (documents.length > 0) {
          await vectorStore.addDocuments(documents);
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
            content: `Hi ${user?.username || 'there'}! I can help you understand your finances. Try asking questions like "How much did I spend on groceries this month?" or "Am I on track with my budget?"`,
          },
        ]);
      } catch (error) {
        console.error('Error loading data into vector store:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFinancialData();
  }, [vectorStore, transactions, categories, summary, insights, user, dataLoaded]);

  // Generate automated financial insights
  const generateSmartInsights = () => {
    if (!summary || !transactions || !categories) return [];

    const smartInsights = [];

    // Budget status insight
    const budgetUsedPercentage =
      summary.totalBudget > 0 ? (summary.totalExpenses / summary.totalBudget) * 100 : 0;
    smartInsights.push({
      title: 'Budget Status',
      content: `You've used ${budgetUsedPercentage.toFixed(0)}% of your monthly budget ($${summary.totalExpenses.toFixed(2)} of $${summary.totalBudget.toFixed(2)})`,
      icon:
        budgetUsedPercentage > 90
          ? 'warning'
          : budgetUsedPercentage > 75
            ? 'alert'
            : 'checkmark-circle',
      color:
        budgetUsedPercentage > 90 ? '#f44336' : budgetUsedPercentage > 75 ? '#ff9800' : '#4caf50',
    });

    // Top spending category from category breakdown
    if (summary.categoryBreakdown && summary.categoryBreakdown.length > 0) {
      const topCategory = summary.categoryBreakdown.reduce((prev, current) =>
        prev.spent > current.spent ? prev : current
      );

      smartInsights.push({
        title: 'Top Spending Category',
        content: `Your highest spending is in ${topCategory.name} at $${topCategory.spent.toFixed(2)}`,
        icon: 'trending-up',
        color: '#2196f3',
      });
    }

    // Category budget warnings from category breakdown
    if (summary.categoryBreakdown) {
      summary.categoryBreakdown.forEach((breakdown: CategoryBreakdown) => {
        if (breakdown.percentage > 85) {
          smartInsights.push({
            title: `${breakdown.name} Budget Alert`,
            content: `You've used ${breakdown.percentage.toFixed(0)}% of your ${breakdown.name} budget`,
            icon: breakdown.percentage > 100 ? 'alert-circle' : 'alert',
            color: breakdown.percentage > 100 ? '#f44336' : '#ff9800',
          });
        }
      });
    }

    // Income vs expenses insight
    if (summary.totalIncome > 0) {
      const savingsRate =
        ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100;
      smartInsights.push({
        title: 'Savings Rate',
        content: `You're saving ${savingsRate.toFixed(0)}% of your income ($${(summary.totalIncome - summary.totalExpenses).toFixed(2)})`,
        icon: savingsRate > 20 ? 'trending-up' : savingsRate > 0 ? 'remove' : 'trending-down',
        color: savingsRate > 20 ? '#4caf50' : savingsRate > 0 ? '#ff9800' : '#f44336',
      });
    }

    return smartInsights;
  };

  // Handle user query submission
  const handleSubmitQuery = async () => {
    if (!query.trim() || !vectorStore) return;

    try {
      setIsLoading(true);

      // Add user message
      const userMessage = { role: 'user' as const, content: query };
      setMessages((prev) => [...prev, userMessage]);

      // Retrieve relevant documents
      const searchResults = await vectorStore.similaritySearch(query, 5);

      // Format context from retrieved documents
      const context = searchResults.map((doc) => doc.pageContent).join('\n');

      // Generate response based on context and query
      const aiResponse = await generateResponse(query, context);

      // Add AI response
      setMessages((prev) => [...prev, { role: 'assistant', content: aiResponse }]);
      setQuery('');
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
      return `Your total income this month is $${summary?.totalIncome?.toFixed(2) || 0}. After expenses of $${summary?.totalExpenses?.toFixed(2) || 0}, you have $${((summary?.totalIncome || 0) - (summary?.totalExpenses || 0)).toFixed(2)} left.`;
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
      const savings = (summary?.totalIncome || 0) - (summary?.totalExpenses || 0);
      const savingsRate = summary?.totalIncome > 0 ? (savings / summary.totalIncome) * 100 : 0;
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

  // Show loading state while data is being fetched
  if (summaryLoading || insightsLoading || (!dataLoaded && isLoading)) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Financial Insights</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Analyzing your financial data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Financial Insights</Text>

      {/* Smart Insights Section */}
      <View style={styles.insightsContainer}>
        <Text style={styles.sectionTitle}>Smart Insights</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {generateSmartInsights().map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <View style={[styles.iconContainer, { backgroundColor: insight.color }]}>
                <Ionicons name={insight.icon as any} size={24} color="white" />
              </View>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightContent}>{insight.content}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Generated Insights from Backend */}
      {insights && insights.length > 0 && (
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
        <Text style={styles.sectionTitle}>Ask About Your Finances</Text>

        <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
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
              <ActivityIndicator size="small" color="#0000ff" />
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Ask about your finances..."
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.sendButton, !query.trim() && styles.disabledButton]}
            onPress={handleSubmitQuery}
            disabled={!query.trim() || isLoading}>
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F7FA',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  insightsContainer: {
    marginBottom: 30,
  },
  insightCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 280,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  insightContent: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    marginBottom: 16,
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
