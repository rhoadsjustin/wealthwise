import type { Category } from '@/context/DataContext';
import {
  buildFinanceAssistantContext,
  buildFinanceAssistantSystemPrompt,
  resolveBudgetToolRequest,
  type BudgetToolArguments,
  type BudgetToolResult,
  type FinanceAssistantContextData,
  type FinanceAssistantContextSection,
} from '@/lib/ai/financeAssistantContext';

type SectionTag = FinanceAssistantContextSection['tag'];

const CATEGORY_FOCUS_TERMS = [
  'category',
  'budget',
  'spending',
  'save',
  'savings',
  'risk',
  'over budget',
  'overspent',
  'overspending',
  'healthiest',
  'grocery',
  'groceries',
  'dining',
  'restaurant',
  'restaurants',
  'takeout',
  'coffee',
  'fuel',
  'gas',
  'rent',
  'mortgage',
  'utility',
  'utilities',
  'subscription',
  'subscriptions',
  'insurance',
  'shopping',
  'travel',
];

const RECENT_ACTIVITY_TERMS = [
  'transaction',
  'transactions',
  'charge',
  'charges',
  'purchase',
  'purchases',
  'recent',
  'recently',
  'lately',
  'latest',
  'changed',
  'change',
  'spike',
  'spiked',
  'what changed',
];

const SIGNAL_TERMS = [
  'insight',
  'insights',
  'signal',
  'signals',
  'trend',
  'trends',
  'risk',
  'at risk',
  'over budget',
  'overspent',
  'overspending',
];

export interface FinanceAssistantPromptBundle {
  systemPrompt: string;
  taggedContext: string;
  sections: FinanceAssistantContextSection[];
  toolResults: BudgetToolResult[];
}

export interface FinanceAssistantPromptInput extends FinanceAssistantContextData {
  prompt: string;
}

export function buildFinanceAssistantPromptBundle(
  input: FinanceAssistantPromptInput
): FinanceAssistantPromptBundle {
  const baseContext = buildFinanceAssistantContext(input);
  const tags = pickRelevantSectionTags(input.prompt);
  const filteredSections = baseContext.sections.filter((section) => tags.has(section.tag));
  const sections = filteredSections.length ? filteredSections : baseContext.sections;
  const toolResults = buildRelevantToolResults(input);

  const taggedParts = sections.map(
    (section) => `<${section.tag}>${section.content}</${section.tag}>`
  );

  if (toolResults.length) {
    taggedParts.push(
      `<tool_results>${toolResults.map((result) => result.text).join('\n\n')}</tool_results>`
    );
  }

  const taggedContext = taggedParts.join('\n\n');

  return {
    systemPrompt: buildFinanceAssistantSystemPrompt(taggedContext),
    taggedContext,
    sections,
    toolResults,
  };
}

function pickRelevantSectionTags(prompt: string): Set<SectionTag> {
  const normalized = normalize(prompt);
  const tags = new Set<SectionTag>(['summary']);

  if (includesAny(normalized, CATEGORY_FOCUS_TERMS)) {
    tags.add('categories');
  }

  if (includesAny(normalized, RECENT_ACTIVITY_TERMS)) {
    tags.add('recent_transactions');
  }

  if (includesAny(normalized, SIGNAL_TERMS)) {
    tags.add('signals');
  }

  return tags;
}

function buildRelevantToolResults(input: FinanceAssistantPromptInput): BudgetToolResult[] {
  if (!input.summary) return [];

  const normalized = normalize(input.prompt);
  const categoryName = matchCategoryName(input.categories ?? [], normalized);
  const requests: BudgetToolArguments[] = [];

  if (
    includesAny(normalized, [
      'top spending',
      'biggest spending',
      'highest spending',
      'top categories',
      'spending categories',
      'where can i save',
      'where should i save',
      'save this month',
      'cut back',
      'trim spending',
      'free up cash',
      'budget risks',
      'at risk',
      'over budget',
      'overspent',
      'healthiest category',
      'best category',
    ])
  ) {
    requests.push({ scope: 'topCategories', limit: 5 });
  }

  if (
    includesAny(normalized, [
      'summary',
      'overall',
      'remaining budget',
      'left in my budget',
      'how am i doing',
      'how am i tracking',
      'income',
      'expenses',
    ])
  ) {
    requests.push({ scope: 'summary', limit: 4 });
  }

  if (categoryName) {
    requests.push({
      scope: 'category',
      categoryName,
      includeTransactions: includesAny(normalized, [
        'why',
        'transaction',
        'transactions',
        'recent',
        'charge',
        'charges',
      ]),
      limit: 3,
    });
  }

  if (
    includesAny(normalized, [
      'transaction',
      'transactions',
      'recent charges',
      'latest charges',
      'recent spending',
      'recent activity',
      'recent expenses',
      'what changed in my spending',
      'what changed',
      'changed lately',
      'changed this month',
      'lately',
    ])
  ) {
    requests.push({
      scope: 'transactions',
      categoryName: categoryName ?? undefined,
      limit: 5,
    });
  }

  const uniqueRequests = dedupeRequests(requests).slice(0, 3);
  return uniqueRequests.map((request) =>
    resolveBudgetToolRequest(request, {
      summary: input.summary,
      categories: input.categories,
      transactions: input.transactions,
    })
  );
}

function dedupeRequests(requests: BudgetToolArguments[]): BudgetToolArguments[] {
  const seen = new Set<string>();
  return requests.filter((request) => {
    const key = JSON.stringify(request);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matchCategoryName(categories: Category[], normalizedPrompt: string): string | null {
  let match: string | null = null;

  for (const category of categories) {
    const normalizedName = normalize(category.name);
    if (!normalizedName) continue;
    if (normalizedPrompt.includes(normalizedName)) {
      if (!match || normalizedName.length > normalize(match).length) {
        match = category.name;
      }
    }
  }

  return match;
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}
