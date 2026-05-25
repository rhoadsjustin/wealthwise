import type {
  BudgetClassification,
  BudgetInsightsPayload,
  BudgetRecommendation,
  BudgetSnapshot,
} from '@/lib/ai/appleBudgetAdvisor';

export interface AssistantContextDoc {
  id: string;
  content: string;
}

export interface BudgetSignalSummary {
  title: string;
  value: string;
  detail: string;
  tone: 'default' | 'success' | 'warning' | 'error';
}

export interface BudgetAssistantContext {
  docs: AssistantContextDoc[];
  summary: BudgetSignalSummary | null;
  suggestedPrompts: string[];
}

interface BuildBudgetAssistantContextParams {
  payload: BudgetInsightsPayload | null;
  latestMonth: string | null;
  latestClassifications: BudgetClassification[];
  recommendations: BudgetRecommendation[];
  snapshotMap: Map<string, BudgetSnapshot>;
  formatCurrency: (value: number) => string;
  formatMonthLabel: (month: string | null | undefined) => string;
}

export function buildBudgetAssistantContext({
  payload,
  latestMonth,
  latestClassifications,
  recommendations,
  snapshotMap,
  formatCurrency,
  formatMonthLabel,
}: BuildBudgetAssistantContextParams): BudgetAssistantContext {
  if (!payload || !latestMonth || !latestClassifications.length) {
    return {
      docs: [],
      summary: null,
      suggestedPrompts: [],
    };
  }

  const topOverages = latestClassifications
    .filter((entry) => entry.predictedStatus === 'over')
    .sort((left, right) => right.variance - left.variance)
    .slice(0, 2);

  const topRecommendation = recommendations[0];
  const monthLabel = formatMonthLabel(latestMonth);
  const overCount = latestClassifications.filter(
    (entry) => entry.predictedStatus === 'over'
  ).length;
  const balancedCount = latestClassifications.filter(
    (entry) => entry.predictedStatus === 'balanced'
  ).length;

  const summary =
    overCount > 0
      ? {
          title: 'Budget signal',
          value: `${overCount} category${overCount === 1 ? '' : 'ies'} at risk`,
          detail:
            topOverages[0] != null
              ? `${topOverages[0].categoryName} is tracking ${Math.round(
                  topOverages[0].spendRatio * 100
                )}% of plan for ${monthLabel}.`
              : `${monthLabel} has categories trending over budget.`,
          tone: 'warning' as const,
        }
      : {
          title: 'Budget signal',
          value:
            balancedCount === latestClassifications.length ? 'Budgets on track' : 'Spending stable',
          detail: `${monthLabel} budgets look balanced from the latest on-device training run.`,
          tone: 'success' as const,
        };

  const docs: AssistantContextDoc[] = [];
  docs.push({
    id: `budget-summary-${latestMonth}`,
    content: `Budget coach summary for ${monthLabel}: ${summary.value}. ${summary.detail}`,
  });

  latestClassifications.slice(0, 4).forEach((entry) => {
    const snapshot = snapshotMap.get(`${entry.categoryId}:${entry.month}`);
    const spent = snapshot?.spent ?? 0;
    const budget = snapshot?.budget ?? 0;
    docs.push({
      id: `budget-category-${entry.categoryId}-${entry.month}`,
      content: `${entry.categoryName} in ${monthLabel}: spent ${formatCurrency(
        spent
      )} against a ${formatCurrency(budget)} budget. Predicted status ${entry.predictedStatus}. Confidence ${Math.round(
        entry.confidence * 100
      )}%.`,
    });
  });

  if (topRecommendation) {
    docs.push({
      id: `budget-recommendation-${topRecommendation.categoryId ?? 0}`,
      content: `Top budget recommendation: revisit ${topRecommendation.categoryName}. Recommendation score ${topRecommendation.score.toFixed(
        2
      )}.`,
    });
  }

  const promptPool = [
    topOverages[0] ? `Why is ${topOverages[0].categoryName} over budget this month?` : null,
    topRecommendation
      ? `What should I change about my ${topRecommendation.categoryName} budget?`
      : null,
    `Summarize my biggest budget risks for ${monthLabel}.`,
    `Which category looks healthiest in ${monthLabel}?`,
  ];

  return {
    docs,
    summary,
    suggestedPrompts: promptPool.filter((prompt): prompt is string => !!prompt).slice(0, 4),
  };
}
