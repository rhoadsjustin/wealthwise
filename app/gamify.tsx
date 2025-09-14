import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAppData } from './_layout';
import { Card, CardContent } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useVectorStore } from '../context/RAGContext';
import { useState, useEffect } from 'react';

export default function GamifyTab() {
  const { summary, transactions, summaryLoading, user, categories } = useAppData();
  const { vectorStore } = useVectorStore();
  const [aiInsights, setAiInsights] = useState<
    {
      type: 'motivation' | 'tip' | 'warning' | 'celebration';
      title: string;
      content: string;
      color: string;
      icon: string;
    }[]
  >([]);
  const [personalizedChallenges, setPersonalizedChallenges] = useState<
    {
      id: string;
      name: string;
      description: string;
      progress: number;
      target: number;
      reward: string;
      color: string;
      aiGenerated: boolean;
    }[]
  >([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    streakType: 'budget' as 'budget' | 'transaction' | 'savings',
    lastActivityDate: null as string | null,
  });

  // Generate AI insights and personalized challenges
  useEffect(() => {
    if (!vectorStore || !summary || !transactions || !categories) return;

    const generateAIInsights = async () => {
      setIsGeneratingInsights(true);
      try {
        // Create financial context for AI analysis
        const financialContext = `
          User: ${user?.username || 'User'}
          Total Budget: $${summary.totalBudget}
          Total Expenses: $${summary.totalExpenses}
          Remaining Budget: $${summary.remainingBudget}
          Budget Usage: ${((summary.totalExpenses / summary.totalBudget) * 100).toFixed(1)}%
          Transaction Count: ${transactions.length}
          Categories: ${categories.map((cat) => cat.name).join(', ')}
          Top Spending Categories: ${summary.categoryBreakdown
            .sort((a, b) => b.spent - a.spent)
            .slice(0, 3)
            .map((cat) => `${cat.name}: $${cat.spent}`)
            .join(', ')}
        `;

        // Generate insights based on spending patterns
        const insights = await generatePersonalizedInsights(financialContext);
        setAiInsights(insights);

        // Generate personalized challenges
        const challenges = await generatePersonalizedChallenges(financialContext);
        setPersonalizedChallenges(challenges);

        // Calculate streak data
        const streaks = calculateStreakData();
        setStreakData(streaks);
      } catch (error) {
        console.error('Error generating AI insights:', error);
      } finally {
        setIsGeneratingInsights(false);
      }
    };

    generateAIInsights();
  }, [vectorStore, summary, transactions, categories, user]);

  // Generate personalized insights based on spending patterns
  const generatePersonalizedInsights = async (context: string) => {
    const budgetUsage = (summary.totalExpenses / summary.totalBudget) * 100;
    const insights = [];

    if (budgetUsage < 50) {
      insights.push({
        type: 'celebration' as const,
        title: 'Excellent Budget Control!',
        content: `You've only used ${budgetUsage.toFixed(0)}% of your budget. Keep up the great work!`,
        color: '#4CAF50',
        icon: 'trophy-outline',
      });
    } else if (budgetUsage < 80) {
      insights.push({
        type: 'motivation' as const,
        title: 'Good Progress',
        content: `You're at ${budgetUsage.toFixed(0)}% of your budget. You're doing well!`,
        color: '#2196F3',
        icon: 'thumbs-up-outline',
      });
    } else if (budgetUsage < 100) {
      insights.push({
        type: 'warning' as const,
        title: 'Budget Alert',
        content: `You've used ${budgetUsage.toFixed(0)}% of your budget. Consider slowing down spending.`,
        color: '#FF9800',
        icon: 'warning-outline',
      });
    } else {
      insights.push({
        type: 'warning' as const,
        title: 'Over Budget',
        content: `You're ${(budgetUsage - 100).toFixed(0)}% over budget. Time to reassess your spending.`,
        color: '#F44336',
        icon: 'alert-circle-outline',
      });
    }

    // Spending pattern insights
    const topCategory = summary.categoryBreakdown.reduce((prev, current) =>
      prev.spent > current.spent ? prev : current
    );

    if (topCategory.percentage > 80) {
      insights.push({
        type: 'tip' as const,
        title: 'Category Focus',
        content: `Your ${topCategory.name} spending is at ${topCategory.percentage.toFixed(0)}%. Consider ways to reduce costs here.`,
        color: '#9C27B0',
        icon: 'bulb-outline',
      });
    }

    // Transaction frequency insight
    const avgTransactionsPerDay = transactions.length / new Date().getDate();
    if (avgTransactionsPerDay > 5) {
      insights.push({
        type: 'tip' as const,
        title: 'Transaction Tracking',
        content: `You're logging ${avgTransactionsPerDay.toFixed(1)} transactions per day. Great job staying on top of your spending!`,
        color: '#607D8B',
        icon: 'checkmark-circle-outline',
      });
    }

    return insights.slice(0, 3); // Limit to 3 insights
  };

  // Generate personalized challenges
  const generatePersonalizedChallenges = async (context: string) => {
    const challenges = [];
    const budgetUsage = (summary.totalExpenses / summary.totalBudget) * 100;

    // Challenge based on budget usage
    if (budgetUsage < 90) {
      challenges.push({
        id: 'ai-budget-master',
        name: 'AI Budget Master',
        description: 'Stay under 85% of your total budget',
        progress: budgetUsage > 85 ? 0 : 1,
        target: 1,
        reward: '50 XP + Budget Guru Badge',
        color: '#4CAF50',
        aiGenerated: true,
      });
    }

    // Challenge based on top spending category
    const topCategory = summary.categoryBreakdown.reduce((prev, current) =>
      prev.spent > current.spent ? prev : current
    );

    if (topCategory.percentage > 70) {
      challenges.push({
        id: 'ai-category-control',
        name: `${topCategory.name} Control Challenge`,
        description: `Keep your ${topCategory.name} spending under 70% of budget`,
        progress: topCategory.percentage > 70 ? 0 : 1,
        target: 1,
        reward: '40 XP + Category Expert Badge',
        color: '#2196F3',
        aiGenerated: true,
      });
    }

    // Savings challenge based on remaining budget
    const savingsPotential = summary.remainingBudget;
    if (savingsPotential > 0) {
      challenges.push({
        id: 'ai-savings-boost',
        name: 'AI Savings Booster',
        description: `Save at least $${(savingsPotential * 0.5).toFixed(0)} more this month`,
        progress: 0,
        target: 1,
        reward: '75 XP + Savings Champion Badge',
        color: '#FF9800',
        aiGenerated: true,
      });
    }

    return challenges;
  };

  // Calculate streak data based on spending behavior
  const calculateStreakData = () => {
    const budgetUsage = (summary.totalExpenses / summary.totalBudget) * 100;
    const daysInMonth = new Date().getDate();

    // Simple streak calculation based on budget adherence
    let currentStreak = 0;
    let streakType: 'budget' | 'transaction' | 'savings' = 'budget';

    if (budgetUsage <= 90) {
      currentStreak = Math.floor(daysInMonth / 7); // Weekly budget streaks
      streakType = 'budget';
    } else if (transactions.length >= daysInMonth * 2) {
      currentStreak = Math.floor(transactions.length / 10); // Transaction tracking streaks
      streakType = 'transaction';
    } else if (summary.remainingBudget > 0) {
      currentStreak = 1; // Savings streak
      streakType = 'savings';
    }

    return {
      currentStreak,
      longestStreak: Math.max(currentStreak + 2, 5), // Mock longest streak
      streakType,
      lastActivityDate: new Date().toISOString().split('T')[0],
    };
  };

  if (summaryLoading || !summary) {
    return (
      <ScrollView className="content-padding">
        <View className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </View>
      </ScrollView>
    );
  }

  // Calculate gamification metrics
  const budgetPercentage =
    summary.totalBudget > 0
      ? ((summary.totalBudget - summary.remainingBudget) / summary.totalBudget) * 100
      : 0;

  const transactionCount = transactions?.length || 0;
  const categoriesUsed = summary.categoryBreakdown.filter((cat) => cat.spent > 0).length;
  const daysInMonth = new Date().getDate();
  const avgDailySpending = summary.totalExpenses / daysInMonth;

  // Calculate level and XP
  const calculateLevel = () => {
    let xp = 0;

    // XP for staying under budget
    if (budgetPercentage <= 100) xp += 100;
    if (budgetPercentage <= 80) xp += 50;
    if (budgetPercentage <= 60) xp += 25;

    // XP for transaction tracking
    xp += Math.min(transactionCount * 2, 100);

    // XP for category diversity (balanced spending)
    xp += categoriesUsed * 10;

    // XP for consistency (daily spending not too volatile)
    const consistencyBonus = avgDailySpending < summary.totalBudget / 30 ? 50 : 0;
    xp += consistencyBonus;

    const level = Math.floor(xp / 100) + 1;
    const currentLevelXP = xp % 100;

    return { level, xp, currentLevelXP };
  };

  const { level, xp, currentLevelXP } = calculateLevel();

  const achievements = [
    {
      id: 1,
      name: 'Budget Master',
      description: 'Stay under budget for the month',
      icon: 'trophy-outline',
      unlocked: budgetPercentage <= 100,
      color: '#FFD700',
      xp: 100,
    },
    {
      id: 2,
      name: 'Tracking Champion',
      description: 'Log 50+ transactions this month',
      icon: 'target-outline',
      unlocked: transactionCount >= 50,
      color: '#FF6B6B',
      xp: 75,
    },
    {
      id: 3,
      name: 'Category Explorer',
      description: 'Use 5+ different spending categories',
      icon: 'star-outline',
      unlocked: categoriesUsed >= 5,
      color: '#4ECDC4',
      xp: 50,
    },
    {
      id: 4,
      name: 'Savings Superstar',
      description: 'Stay under 80% of monthly budget',
      icon: 'medal-outline',
      unlocked: budgetPercentage <= 80,
      color: '#45B7D1',
      xp: 150,
    },
    {
      id: 5,
      name: 'Consistency King',
      description: 'Maintain steady daily spending',
      icon: 'flash-outline',
      unlocked: avgDailySpending < summary.totalBudget / 30,
      color: '#96CEB4',
      xp: 75,
    },
    {
      id: 6,
      name: 'Frugal Fighter',
      description: 'Stay under 60% of monthly budget',
      icon: 'trophy-outline',
      unlocked: budgetPercentage <= 60,
      color: '#FFEAA7',
      xp: 200,
    },
  ];

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const lockedAchievements = achievements.filter((a) => !a.unlocked);

  const challenges = [
    {
      id: 1,
      name: 'Daily Budget Challenge',
      description: 'Stay under daily budget for 7 days straight',
      progress: Math.min(daysInMonth, 7),
      target: 7,
      reward: '25 XP',
      color: '#FF6B6B',
    },
    {
      id: 2,
      name: 'Category Balance',
      description: 'Keep all categories under 100% budget',
      progress: summary.categoryBreakdown.filter((cat) => cat.percentage <= 100).length,
      target: summary.categoryBreakdown.length,
      reward: '50 XP',
      color: '#4ECDC4',
    },
    {
      id: 3,
      name: 'Transaction Tracker',
      description: 'Log at least 3 transactions per week',
      progress: Math.min(Math.floor(transactionCount / 3), 4),
      target: 4,
      reward: '40 XP',
      color: '#45B7D1',
    },
  ];

  const getLevelTitle = (level: number) => {
    if (level >= 10) return 'Budget Guru';
    if (level >= 8) return 'Money Master';
    if (level >= 6) return 'Savings Expert';
    if (level >= 4) return 'Budget Pro';
    if (level >= 2) return 'Finance Tracker';
    return 'Budget Beginner';
  };

  const getNextLevelReward = (level: number) => {
    const rewards = [
      'New achievement badge',
      'Advanced insights unlock',
      'Custom category colors',
      'Export reports feature',
      'Budget forecasting',
      'Spending analytics',
      'Goal tracking tools',
      'Premium themes',
      'Advanced charts',
      'Expert status badge',
    ];
    return rewards[level - 1] || 'Mystery reward';
  };

  return (
    <ScrollView className="content-padding">
      {/* Streak Tracker Card */}
      <Card className="card-mobile mb-6">
        <CardContent className="p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">Current Streak</Text>
            <View className="flex-row items-center">
              <Ionicons name="flame-outline" size={16} color="#FF6B35" />
              <Text className="ml-1 text-xs text-orange-600">Keep it up!</Text>
            </View>
          </View>

          <View className="rounded-lg bg-gradient-to-r from-orange-50 to-red-50 p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-3xl font-bold text-orange-600">
                  {streakData.currentStreak}
                </Text>
                <Text className="text-sm text-orange-700">
                  {streakData.streakType === 'budget'
                    ? 'Budget Control Streak'
                    : streakData.streakType === 'transaction'
                      ? 'Tracking Streak'
                      : 'Savings Streak'}
                </Text>
                <Text className="text-xs text-orange-600">
                  Best: {streakData.longestStreak}{' '}
                  {streakData.streakType === 'budget' ? 'weeks' : 'days'}
                </Text>
              </View>
              <View className="items-center">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                  <Ionicons name="flame" size={32} color="#FF6B35" />
                </View>
                <Text className="mt-2 text-xs text-orange-600">🔥 Hot Streak!</Text>
              </View>
            </View>
          </View>

          {streakData.currentStreak > 0 && (
            <View className="mt-3 rounded-lg bg-yellow-50 p-3">
              <Text className="text-sm font-semibold text-yellow-800">Streak Bonus Active!</Text>
              <Text className="text-xs text-yellow-700">
                Earn +{streakData.currentStreak * 5} XP for each completed challenge
              </Text>
            </View>
          )}
        </CardContent>
      </Card>

      {/* AI Insights Card */}
      {aiInsights.length > 0 && (
        <Card className="card-mobile mb-6">
          <CardContent className="p-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900">AI Insights</Text>
              <View className="flex-row items-center">
                <Ionicons name="sparkles-outline" size={16} color="#9C27B0" />
                <Text className="ml-1 text-xs text-purple-600">Powered by AI</Text>
              </View>
            </View>

            <View className="space-y-3">
              {aiInsights.map((insight, index) => (
                <View
                  key={index}
                  className="rounded-lg p-3"
                  style={{ backgroundColor: `${insight.color}15` }}>
                  <View className="flex-row items-start">
                    <View className="mr-3 mt-0.5">
                      <Ionicons name={insight.icon} size={20} color={insight.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="mb-1 text-sm font-semibold text-gray-900">
                        {insight.title}
                      </Text>
                      <Text className="text-sm text-gray-700">{insight.content}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {isGeneratingInsights && (
              <View className="flex-row items-center justify-center py-4">
                <ActivityIndicator size="small" color="#9C27B0" />
                <Text className="ml-2 text-sm text-gray-600">Generating insights...</Text>
              </View>
            )}
          </CardContent>
        </Card>
      )}

      {/* Level & XP Card */}
      <Card className="card-mobile mb-6">
        <CardContent className="p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600">
                <Ionicons name="trophy-outline" size={24} color="white" />
              </View>
              <View>
                <Text className="text-lg font-bold text-gray-900">Level {level}</Text>
                <Text className="text-sm text-gray-600">{getLevelTitle(level)}</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-sm font-semibold text-gray-900">{xp} XP</Text>
              <Text className="text-xs text-gray-600">Total Earned</Text>
            </View>
          </View>

          <View className="mb-3">
            <View className="mb-2 flex-row justify-between">
              <Text className="text-sm font-medium text-gray-700">
                Progress to Level {level + 1}
              </Text>
              <Text className="text-sm text-gray-600">{currentLevelXP}/100 XP</Text>
            </View>
            <View className="h-3 rounded-full bg-gray-200">
              <View
                className="h-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600"
                style={{ width: `${currentLevelXP}%` }}
              />
            </View>
          </View>

          <View className="rounded-lg bg-yellow-50 p-3">
            <Text className="text-sm font-medium text-yellow-800">Next Level Reward</Text>
            <Text className="text-sm text-yellow-700">{getNextLevelReward(level)}</Text>
          </View>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="card-mobile mb-6">
        <CardContent className="p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">Achievements</Text>
            <Text className="text-sm text-gray-600">
              {unlockedAchievements.length}/{achievements.length} unlocked
            </Text>
          </View>

          <View className="space-y-3">
            {unlockedAchievements.map((achievement) => (
              <View
                key={achievement.id}
                className="flex-row items-center rounded-lg bg-green-50 p-3">
                <View
                  className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${achievement.color}20` }}>
                  <Ionicons name={achievement.icon} size={20} color={achievement.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">{achievement.name}</Text>
                  <Text className="text-xs text-gray-600">{achievement.description}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs font-semibold text-green-600">+{achievement.xp} XP</Text>
                  <Text className="text-xs text-green-600">✓ Unlocked</Text>
                </View>
              </View>
            ))}

            {lockedAchievements.slice(0, 2).map((achievement) => (
              <View
                key={achievement.id}
                className="flex-row items-center rounded-lg bg-gray-50 p-3 opacity-60">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                  <Ionicons name={achievement.icon} size={20} color="#9CA3AF" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700">{achievement.name}</Text>
                  <Text className="text-xs text-gray-500">{achievement.description}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-gray-500">+{achievement.xp} XP</Text>
                  <Text className="text-xs text-gray-500">🔒 Locked</Text>
                </View>
              </View>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* Current Challenges */}
      <Card className="card-mobile mb-6">
        <CardContent className="p-4">
          <Text className="mb-4 text-lg font-semibold text-gray-900">Active Challenges</Text>

          <View className="space-y-4">
            {/* AI Generated Challenges */}
            {personalizedChallenges.map((challenge) => (
              <View
                key={challenge.id}
                className="rounded-lg border-2 border-dashed border-purple-300 bg-purple-50 p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center">
                    <Ionicons name="sparkles" size={16} color="#9C27B0" />
                    <Text className="ml-2 flex-1 text-sm font-semibold text-purple-900">
                      {challenge.name}
                    </Text>
                  </View>
                  <View className="rounded-full bg-purple-200 px-2 py-1">
                    <Text className="text-xs font-medium text-purple-800">{challenge.reward}</Text>
                  </View>
                </View>

                <Text className="mb-3 text-xs text-purple-700">{challenge.description}</Text>

                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-purple-700">Progress</Text>
                  <Text className="text-xs text-purple-600">
                    {challenge.progress}/{challenge.target}
                  </Text>
                </View>

                <View className="h-2 rounded-full bg-purple-200">
                  <View
                    className="h-2 rounded-full bg-purple-500"
                    style={{
                      width: `${Math.min((challenge.progress / challenge.target) * 100, 100)}%`,
                    }}
                  />
                </View>

                <View className="mt-2 flex-row items-center">
                  <Ionicons name="robot-outline" size={12} color="#9C27B0" />
                  <Text className="ml-1 text-xs text-purple-600">AI Generated Challenge</Text>
                </View>
              </View>
            ))}

            {/* Standard Challenges */}
            {challenges.map((challenge) => (
              <View key={challenge.id} className="rounded-lg border border-gray-200 p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="flex-1 text-sm font-semibold text-gray-900">
                    {challenge.name}
                  </Text>
                  <View className="rounded-full bg-blue-100 px-2 py-1">
                    <Text className="text-xs font-medium text-blue-800">{challenge.reward}</Text>
                  </View>
                </View>

                <Text className="mb-3 text-xs text-gray-600">{challenge.description}</Text>

                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-gray-700">Progress</Text>
                  <Text className="text-xs text-gray-600">
                    {challenge.progress}/{challenge.target}
                  </Text>
                </View>

                <View className="h-2 rounded-full bg-gray-200">
                  <View
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min((challenge.progress / challenge.target) * 100, 100)}%`,
                      backgroundColor: challenge.color,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* Smart Recommendations */}
      <Card className="card-mobile mb-6">
        <CardContent className="p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">Smart Recommendations</Text>
            <Ionicons name="bulb-outline" size={20} color="#FF9800" />
          </View>

          <View className="space-y-3">
            {summary.categoryBreakdown
              .filter((cat) => cat.percentage > 90)
              .slice(0, 2)
              .map((category, index) => (
                <View key={index} className="rounded-lg bg-orange-50 p-3">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-orange-900">
                      Reduce {category.name} Spending
                    </Text>
                    <Text className="rounded-full bg-orange-200 px-2 py-1 text-xs text-orange-800">
                      Save $20-50
                    </Text>
                  </View>
                  <Text className="text-xs text-orange-700">
                    You're at {category.percentage.toFixed(0)}% of your {category.name} budget.
                    Consider finding alternatives or reducing frequency.
                  </Text>
                </View>
              ))}

            {summary.remainingBudget > 100 && (
              <View className="rounded-lg bg-green-50 p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-green-900">Boost Your Savings</Text>
                  <Text className="rounded-full bg-green-200 px-2 py-1 text-xs text-green-800">
                    +25 XP
                  </Text>
                </View>
                <Text className="text-xs text-green-700">
                  You have ${summary.remainingBudget.toFixed(0)} left! Consider moving some to
                  savings for extra XP.
                </Text>
              </View>
            )}
          </View>
        </CardContent>
      </Card>

      {/* RAG Analytics Card */}
      <Card className="card-mobile mb-6">
        <CardContent className="p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">AI Analytics</Text>
            <TouchableOpacity className="flex-row items-center rounded-full bg-indigo-100 px-3 py-1">
              <Ionicons name="refresh-outline" size={14} color="#6366F1" />
              <Text className="ml-1 text-xs text-indigo-600">Refresh</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            {/* Spending Velocity */}
            <View className="rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
              <View className="mb-2 flex-row items-center">
                <Ionicons name="speedometer-outline" size={20} color="#0891B2" />
                <Text className="ml-2 text-sm font-semibold text-gray-900">Spending Velocity</Text>
              </View>
              <Text className="text-2xl font-bold text-cyan-600">
                ${avgDailySpending.toFixed(2)}/day
              </Text>
              <Text className="text-xs text-cyan-700">
                {avgDailySpending < summary.totalBudget / 30
                  ? "Great pace! You're on track."
                  : 'Consider slowing down spending.'}
              </Text>
            </View>

            {/* Budget Efficiency Score */}
            <View className="rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-4">
              <View className="mb-2 flex-row items-center">
                <Ionicons name="analytics-outline" size={20} color="#9333EA" />
                <Text className="ml-2 text-sm font-semibold text-gray-900">Efficiency Score</Text>
              </View>
              <Text className="text-2xl font-bold text-purple-600">
                {Math.max(0, 100 - budgetPercentage).toFixed(0)}/100
              </Text>
              <Text className="text-xs text-purple-700">
                Based on budget utilization and category balance
              </Text>
            </View>

            {/* Prediction Insight */}
            <View className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 p-4">
              <View className="mb-2 flex-row items-center">
                <Ionicons name="trending-up-outline" size={20} color="#D97706" />
                <Text className="ml-2 text-sm font-semibold text-gray-900">Monthly Projection</Text>
              </View>
              <Text className="text-2xl font-bold text-orange-600">
                ${(avgDailySpending * 30).toFixed(0)}
              </Text>
              <Text className="text-xs text-orange-700">
                Projected monthly spend at current rate
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Leaderboard Simulation */}
      <Card className="card-mobile mb-6">
        <CardContent className="p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">Weekly Leaderboard</Text>
            <View className="flex-row items-center">
              <Ionicons name="podium-outline" size={16} color="#FFD700" />
              <Text className="ml-1 text-xs text-yellow-600">Your Rank: #2</Text>
            </View>
          </View>

          <View className="space-y-3">
            <View className="flex-row items-center rounded-lg bg-yellow-50 p-3">
              <Text className="text-lg font-bold text-yellow-600">🥇</Text>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-yellow-900">BudgetPro_Mike</Text>
                <Text className="text-xs text-yellow-700">1,250 XP • 15-day streak</Text>
              </View>
              <Text className="text-sm font-bold text-yellow-600">Level 12</Text>
            </View>

            <View className="flex-row items-center rounded-lg border-2 border-blue-200 bg-gray-50 p-3">
              <Text className="text-lg font-bold text-blue-600">🥈</Text>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-blue-900">
                  {user?.username || 'You'}
                </Text>
                <Text className="text-xs text-blue-700">
                  {xp} XP • {streakData.currentStreak}-
                  {streakData.streakType === 'budget' ? 'week' : 'day'} streak
                </Text>
              </View>
              <Text className="text-sm font-bold text-blue-600">Level {level}</Text>
            </View>

            <View className="flex-row items-center rounded-lg bg-orange-50 p-3">
              <Text className="text-lg font-bold text-orange-600">🥉</Text>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-orange-900">SaverSarah_22</Text>
                <Text className="text-xs text-orange-700">875 XP • 8-day streak</Text>
              </View>
              <Text className="text-sm font-bold text-orange-600">Level 8</Text>
            </View>
          </View>

          <TouchableOpacity className="mt-3 rounded-lg bg-indigo-50 p-3">
            <View className="flex-row items-center justify-center">
              <Ionicons name="trophy-outline" size={16} color="#6366F1" />
              <Text className="ml-2 text-sm font-medium text-indigo-700">
                View Full Leaderboard
              </Text>
            </View>
          </TouchableOpacity>
        </CardContent>
      </Card>

      {/* Achievement Recommendations */}
      <Card className="card-mobile mb-6">
        <CardContent className="p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">Recommended Actions</Text>
            <Ionicons name="target-outline" size={20} color="#10B981" />
          </View>

          <View className="space-y-3">
            {budgetPercentage < 75 && (
              <TouchableOpacity className="rounded-lg border border-green-200 bg-green-50 p-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-green-900">
                      🎯 Unlock "Budget Master" Achievement
                    </Text>
                    <Text className="mt-1 text-xs text-green-700">
                      Stay under 80% budget to earn 150 XP
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={16} color="#059669" />
                </View>
              </TouchableOpacity>
            )}

            {transactionCount < 50 && (
              <TouchableOpacity className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-blue-900">
                      📊 Track More Transactions
                    </Text>
                    <Text className="mt-1 text-xs text-blue-700">
                      {50 - transactionCount} more to unlock "Tracking Champion"
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={16} color="#2563EB" />
                </View>
              </TouchableOpacity>
            )}

            {categoriesUsed < 5 && (
              <TouchableOpacity className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-purple-900">
                      🌟 Diversify Your Spending
                    </Text>
                    <Text className="mt-1 text-xs text-purple-700">
                      Use {5 - categoriesUsed} more categories for "Category Explorer"
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={16} color="#7C3AED" />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <Card className="card-mobile">
        <CardContent className="p-4">
          <Text className="mb-4 text-lg font-semibold text-gray-900">Your Stats</Text>

          <View className="grid grid-cols-2 gap-4">
            <TouchableOpacity className="rounded-lg bg-blue-50 p-3">
              <Text className="text-2xl font-bold text-blue-600">{transactionCount}</Text>
              <Text className="text-sm text-blue-700">Transactions</Text>
              <View className="mt-1 flex-row items-center">
                <Ionicons name="trending-up" size={12} color="#2563EB" />
                <Text className="ml-1 text-xs text-blue-600">
                  +{Math.max(0, transactionCount - 30)} this month
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity className="rounded-lg bg-green-50 p-3">
              <Text className="text-2xl font-bold text-green-600">{categoriesUsed}</Text>
              <Text className="text-sm text-green-700">Categories Used</Text>
              <View className="mt-1 flex-row items-center">
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text className="ml-1 text-xs text-green-600">
                  {categoriesUsed >= 5 ? 'Well diversified' : 'Could diversify more'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity className="rounded-lg bg-yellow-50 p-3">
              <Text className="text-2xl font-bold text-yellow-600">
                {budgetPercentage.toFixed(0)}%
              </Text>
              <Text className="text-sm text-yellow-700">Budget Used</Text>
              <View className="mt-1 flex-row items-center">
                <Ionicons
                  name={
                    budgetPercentage > 90
                      ? 'warning'
                      : budgetPercentage > 75
                        ? 'alert'
                        : 'checkmark-circle'
                  }
                  size={12}
                  color={
                    budgetPercentage > 90
                      ? '#EAB308'
                      : budgetPercentage > 75
                        ? '#F59E0B'
                        : '#059669'
                  }
                />
                <Text className="ml-1 text-xs text-yellow-600">
                  ${summary.remainingBudget.toFixed(0)} remaining
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity className="rounded-lg bg-purple-50 p-3">
              <Text className="text-2xl font-bold text-purple-600">{daysInMonth}</Text>
              <Text className="text-sm text-purple-700">Days Tracked</Text>
              <View className="mt-1 flex-row items-center">
                <Ionicons name="calendar" size={12} color="#7C3AED" />
                <Text className="ml-1 text-xs text-purple-600">
                  {Math.ceil(30 - daysInMonth)} days left
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Power-ups and Boosters */}
          <View className="mt-4 border-t border-gray-200 pt-4">
            <Text className="mb-3 text-sm font-semibold text-gray-900">Available Power-ups</Text>
            <View className="flex-row space-x-2">
              <TouchableOpacity className="flex-1 rounded-lg bg-purple-50 p-3">
                <View className="items-center">
                  <Ionicons name="flash" size={20} color="#9333EA" />
                  <Text className="mt-1 text-xs font-medium text-purple-700">2x XP Boost</Text>
                  <Text className="text-xs text-purple-600">24h active</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 rounded-lg bg-green-50 p-3">
                <View className="items-center">
                  <Ionicons name="shield" size={20} color="#059669" />
                  <Text className="mt-1 text-xs font-medium text-green-700">Streak Shield</Text>
                  <Text className="text-xs text-green-600">Protect streak</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 rounded-lg bg-blue-50 p-3">
                <View className="items-center">
                  <Ionicons name="star" size={20} color="#2563EB" />
                  <Text className="mt-1 text-xs font-medium text-blue-700">Lucky Star</Text>
                  <Text className="text-xs text-blue-600">Random bonus</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mt-4 border-t border-gray-200 pt-4">
            <Text className="mb-3 text-sm font-semibold text-gray-900">Quick Actions</Text>
            <View className="flex-row space-x-2">
              <TouchableOpacity className="flex-1 flex-row items-center justify-center rounded-lg bg-indigo-50 py-3">
                <Ionicons name="add-circle-outline" size={16} color="#6366F1" />
                <Text className="ml-2 text-sm font-medium text-indigo-700">Add Transaction</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 flex-row items-center justify-center rounded-lg bg-emerald-50 py-3">
                <Ionicons name="trophy-outline" size={16} color="#10B981" />
                <Text className="ml-2 text-sm font-medium text-emerald-700">View All Badges</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );
}
