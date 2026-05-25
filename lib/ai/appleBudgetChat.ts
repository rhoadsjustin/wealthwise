import { Platform } from 'react-native';
import { requireNativeModule } from 'expo';
import { createAppleProvider } from '@react-native-ai/apple';
import { generateText, tool, type CoreMessage } from 'ai';
import { z } from 'zod';

import type { Category, Transaction } from '@/context/DataContext';
import { formatCurrency } from '@/lib/utils';

export type AppleChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AppleChatMessage {
  role: AppleChatRole;
  content: string;
  name?: string;
}

export interface AppleChatNativeRequest {
  instructions: string;
  messages: AppleChatMessage[];
  options?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
  };
}

export interface AppleChatNativeResponse {
  content: string;
  finishReason?: string;
}

type AppleBudgetChatNativeModule = {
  generate(request: AppleChatNativeRequest): Promise<AppleChatNativeResponse>;
};

let nativeModule: AppleBudgetChatNativeModule | null = null;

function getNativeModule(): AppleBudgetChatNativeModule | null {
  if (nativeModule) return nativeModule;
  try {
    nativeModule = requireNativeModule<AppleBudgetChatNativeModule>('AppleBudgetChatModule');
  } catch {
    // leave as null when module is unavailable
    nativeModule = null;
  }
  return nativeModule;
}

export interface BudgetToolArguments {
  scope: 'summary' | 'category' | 'topCategories' | 'transactions';
  month?: string;
  categoryName?: string;
  limit?: number;
  includeTransactions?: boolean;
  includeTrends?: boolean;
}

export interface BudgetToolResult {
  text: string;
  payload: Record<string, any>;
}

type CategorySnapshot = {
  id: number;
  name: string;
  budget: number;
  spent: number;
  percentage: number | null | undefined;
};

export interface AppleBudgetChatContext {
  summary: any;
  categories: Category[] | null | undefined;
  transactions: Transaction[] | null | undefined;
}

export interface AppleBudgetChatRunParams {
  prompt: string;
  history?: AppleChatMessage[];
  context: AppleBudgetChatContext;
  maxToolIterations?: number;
  generationOptions?: AppleChatNativeRequest['options'];
}

const TOOL_NAME = 'fetchBudgetContext';

const TOOL_PROMPT = `Tool name: ${TOOL_NAME}
Use the tool to fetch precise budget data from the app. Arguments must be JSON matching:
{
  "scope": "summary" | "category" | "topCategories" | "transactions",
  "month": "YYYY-MM",            // optional, defaults to latest month available
  "categoryName": "string",      // required for scope "category" or for filtered transactions
  "limit": number,               // optional, top item count (default 5, max 10)
  "includeTransactions": boolean // optional, include sample transactions when true
}
Call the tool by responding with:
<tool_call name="${TOOL_NAME}">
{ "scope": "summary" }
</tool_call>
Wait for a tool response before producing a final answer.
Always explain insights using plain language and reference amounts with $X,XXX.XX formatting.`;

const BASE_SYSTEM_PROMPT = `You are Apple Budget Advisor, an on-device financial coach for the Budget app.
Answer with concise, actionable guidance grounded in verified numbers.
Respect the user's privacy: never reference data that is not provided via messages or the budget tool.
Assume the current focus is the present month unless the user specifies otherwise.
If data is missing, acknowledge limits and suggest next steps.`;

const MAX_TOOL_ITERATIONS = 3;

const budgetToolSchema = z
  .object({
    scope: z.enum(['summary', 'category', 'topCategories', 'transactions']),
    month: z.string().optional(),
    categoryName: z.string().optional(),
    limit: z.number().int().min(1).max(10).optional(),
    includeTransactions: z.boolean().optional(),
    includeTrends: z.boolean().optional(),
  })
  .strict();

type BudgetToolSchemaInput = z.infer<typeof budgetToolSchema>;

export function buildAppleSystemInstruction(context: AppleBudgetChatContext): string {
  const categoryNames = (context.categories ?? [])
    .map((category) => category?.name)
    .filter(Boolean) as string[];
  const trimmedCategories =
    categoryNames.length > 20
      ? `${categoryNames.slice(0, 20).join(', ')}, and ${categoryNames.length - 20} more`
      : categoryNames.join(', ');

  const months = dedupeMonths(context.transactions ?? []);
  const monthSummary =
    months.length === 0
      ? 'No transaction history is currently loaded.'
      : `Transactions cover ${months.slice(0, 6).join(', ')}${months.length > 6 ? ', ...' : ''}.`;

  const categoryLine =
    trimmedCategories.length > 0
      ? `Tracked categories include: ${trimmedCategories}.`
      : 'Tracked categories are not yet available.';

  return [BASE_SYSTEM_PROMPT, '', monthSummary, categoryLine, '', TOOL_PROMPT].join('\n');
}

function dedupeMonths(transactions: Transaction[]): string[] {
  const set = new Set<string>();
  transactions.forEach((tx) => {
    const month = normalizeMonth(tx.date);
    if (month) set.add(month);
  });
  return Array.from(set).sort();
}

function normalizeMonth(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!date || Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function currentMonth(): string {
  return normalizeMonth(new Date()) ?? 'unknown';
}

function parseToolCall(content: string): {
  name: string;
  args: BudgetToolArguments;
} | null {
  const pattern = /<tool_call name="([^"]+)">\s*([\s\S]+?)\s*<\/tool_call>/i;
  const match = pattern.exec(content);
  if (!match) return null;
  const [, name, body] = match;
  try {
    const args = JSON.parse(body.trim()) as BudgetToolArguments;
    return { name, args };
  } catch {
    return null;
  }
}

function resolveBudgetToolRequest(
  args: BudgetToolArguments,
  context: AppleBudgetChatContext
): BudgetToolResult {
  const categoriesList = Array.isArray(context.categories) ? context.categories : [];
  const transactionsList = Array.isArray(context.transactions) ? context.transactions : [];
  const { summary } = context;
  const targetMonth = args.month ?? selectDefaultMonth(transactionsList);
  const selectedMonth = targetMonth ?? currentMonth();

  switch (args.scope) {
    case 'summary':
      return buildSummaryResult(summary, categoriesList, transactionsList, selectedMonth, args);
    case 'category':
      return buildCategoryResult(summary, categoriesList, transactionsList, selectedMonth, args);
    case 'topCategories':
      return buildTopCategoriesResult(
        summary,
        categoriesList,
        transactionsList,
        selectedMonth,
        args
      );
    case 'transactions':
      return buildTransactionsResult(
        summary,
        categoriesList,
        transactionsList,
        selectedMonth,
        args
      );
    default:
      return {
        text: 'The tool request could not be processed. Provide a valid scope such as "summary", "category", "topCategories", or "transactions".',
        payload: { ok: false, reason: 'invalid_scope', args },
      };
  }
}

function selectDefaultMonth(transactions: Transaction[]): string | null {
  if (!transactions.length) return normalizeMonth(new Date());
  const sorted = [...transactions].sort((a, b) => (a.date > b.date ? -1 : 1));
  for (const tx of sorted) {
    const month = normalizeMonth(tx.date);
    if (month) return month;
  }
  return normalizeMonth(new Date());
}

function buildSummaryResult(
  summary: any,
  categories: Category[],
  transactions: Transaction[],
  month: string,
  args: BudgetToolArguments
): BudgetToolResult {
  const totalBudget = safeNumber(summary?.totalBudget);
  const totalExpenses = safeNumber(summary?.totalExpenses);
  const totalIncome = safeNumber(summary?.totalIncome ?? summary?.actualIncome);
  const remainingBudget = safeNumber(summary?.remainingBudget ?? totalBudget - totalExpenses);

  const topBreakdown: CategorySnapshot[] = Array.isArray(summary?.categoryBreakdown)
    ? summary.categoryBreakdown.slice(0, clampLimit(args.limit)).map((item: any) => ({
        id: item.id,
        name: item.name,
        budget: safeNumber(item.budget),
        spent: safeNumber(item.spent),
        percentage: safeNumber(item.percentage),
      }))
    : buildCategorySnapshotFromTransactions(categories, transactions, month, args.limit);

  const lines: string[] = [];
  lines.push(`Budget summary for ${monthLabel(month)}:`);
  lines.push(`• Total budget: ${formatCurrency(totalBudget)}`);
  lines.push(`• Total expenses: ${formatCurrency(totalExpenses)}`);
  if (Number.isFinite(totalIncome)) {
    lines.push(`• Total income: ${formatCurrency(totalIncome)}`);
  }
  lines.push(`• Remaining budget: ${formatCurrency(remainingBudget)}`);

  if (topBreakdown.length > 0) {
    lines.push('Top categories by spend:');
    topBreakdown.forEach((entry: CategorySnapshot, index: number) => {
      const variance = entry.spent - entry.budget;
      const varianceLabel =
        variance === 0
          ? '$0.00'
          : `${variance > 0 ? '+' : ''}${formatCurrency(Math.abs(variance))}`;
      lines.push(
        `${index + 1}. ${entry.name}: ${formatCurrency(entry.spent)} of ${formatCurrency(entry.budget)} (${Math.round(entry.percentage ?? 0)}%), variance ${varianceLabel}`
      );
    });
  }

  return {
    text: lines.join('\n'),
    payload: {
      scope: 'summary',
      month,
      totals: {
        budget: totalBudget,
        expenses: totalExpenses,
        income: totalIncome,
        remaining: remainingBudget,
      },
      topCategories: topBreakdown,
    },
  };
}

function buildCategoryResult(
  summary: any,
  categories: Category[],
  transactions: Transaction[],
  month: string,
  args: BudgetToolArguments
): BudgetToolResult {
  const requestedName = args.categoryName?.trim();
  if (!requestedName) {
    return {
      text: 'Provide a categoryName to inspect a specific category.',
      payload: { ok: false, reason: 'missing_category', args },
    };
  }

  const matched = matchCategory(categories, requestedName);
  if (!matched) {
    return {
      text: `No category named "${requestedName}" was found.`,
      payload: { ok: false, reason: 'unknown_category', args },
    };
  }

  const breakdownEntry = Array.isArray(summary?.categoryBreakdown)
    ? summary.categoryBreakdown.find(
        (item: any) => normalizeText(item.name) === normalizeText(matched.name)
      )
    : null;

  const relevantTransactions = filterTransactions(transactions, month, matched.id);
  const spentFromTransactions = relevantTransactions.reduce(
    (acc, tx) => acc + safeNumber(tx.amount),
    0
  );

  const budget = safeNumber(breakdownEntry?.budget ?? matched.budget);
  const spent = safeNumber(breakdownEntry?.spent ?? spentFromTransactions);
  const remaining = budget - spent;
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;

  const sampleTransactions = args.includeTransactions
    ? relevantTransactions.slice(0, clampLimit(args.limit) || 5).map((tx) => ({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: safeNumber(tx.amount),
      }))
    : [];

  const lines: string[] = [];
  lines.push(
    `Category "${matched.name}" for ${monthLabel(month)}: ${formatCurrency(spent)} of ${formatCurrency(
      budget
    )} spent (${Math.round(percentage)}% of budget).`
  );
  lines.push(`Remaining budget: ${formatCurrency(remaining)}.`);

  if (args.includeTransactions && sampleTransactions.length > 0) {
    lines.push('Recent transactions:');
    sampleTransactions.forEach((tx) => {
      lines.push(
        `• ${tx.date}: ${tx.description ?? 'No description'} for ${formatCurrency(tx.amount)}`
      );
    });
  }

  return {
    text: lines.join('\n'),
    payload: {
      scope: 'category',
      month,
      category: {
        id: matched.id,
        name: matched.name,
        budget,
        spent,
        remaining,
        percentage,
      },
      transactions: sampleTransactions,
    },
  };
}

function buildTopCategoriesResult(
  summary: any,
  categories: Category[],
  transactions: Transaction[],
  month: string,
  args: BudgetToolArguments
): BudgetToolResult {
  const limit = clampLimit(args.limit);
  const entries: CategorySnapshot[] = Array.isArray(summary?.categoryBreakdown)
    ? summary.categoryBreakdown
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          budget: safeNumber(item.budget),
          spent: safeNumber(item.spent),
          percentage: safeNumber(item.percentage),
        }))
        .sort((a: CategorySnapshot, b: CategorySnapshot) => b.spent - a.spent)
    : buildCategorySnapshotFromTransactions(categories, transactions, month, limit);

  const top = entries.slice(0, limit || 5);

  if (!top.length) {
    return {
      text: 'No category spend data is available yet.',
      payload: { scope: 'topCategories', month, categories: [] },
    };
  }

  const lines: string[] = [];
  lines.push(`Top ${top.length} categories for ${monthLabel(month)}:`);
  top.forEach((entry: CategorySnapshot, index: number) => {
    lines.push(
      `${index + 1}. ${entry.name}: ${formatCurrency(entry.spent)} of ${formatCurrency(entry.budget)} (${Math.round(entry.percentage ?? 0)}%)`
    );
  });

  return {
    text: lines.join('\n'),
    payload: { scope: 'topCategories', month, categories: top },
  };
}

function buildTransactionsResult(
  summary: any,
  categories: Category[],
  transactions: Transaction[],
  month: string,
  args: BudgetToolArguments
): BudgetToolResult {
  const filtered = filterTransactions(
    transactions,
    month,
    args.categoryName ? matchCategory(categories, args.categoryName)?.id : undefined
  );
  const limit = clampLimit(args.limit) || 5;
  const top = filtered.slice(0, limit);

  if (!top.length) {
    return {
      text: `No transactions found for ${args.categoryName ?? 'the selected filters'} in ${monthLabel(month)}.`,
      payload: { scope: 'transactions', month, transactions: [] },
    };
  }

  const lines: string[] = [];
  lines.push(
    `Recent ${top.length} transactions${args.categoryName ? ` for ${args.categoryName}` : ''} in ${monthLabel(month)}:`
  );
  top.forEach((tx) => {
    lines.push(
      `• ${tx.date}: ${tx.description ?? 'No description'} for ${formatCurrency(safeNumber(tx.amount))}`
    );
  });

  return {
    text: lines.join('\n'),
    payload: {
      scope: 'transactions',
      month,
      transactions: top.map((tx) => ({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: safeNumber(tx.amount),
        categoryId: tx.categoryId,
      })),
    },
  };
}

function buildCategorySnapshotFromTransactions(
  categories: Category[],
  transactions: Transaction[],
  month: string,
  limit?: number
): CategorySnapshot[] {
  const limitValue = clampLimit(limit) || undefined;
  const perCategory = new Map<number, { name: string; budget: number; spent: number }>();
  const categoryById = new Map<number, Category>();
  categories.forEach((category) => {
    if (typeof category?.id === 'number') {
      categoryById.set(category.id, category);
      perCategory.set(category.id, {
        name: category.name,
        budget: safeNumber((category as any)?.budget),
        spent: 0,
      });
    }
  });

  const filtered = filterTransactions(transactions, month);
  filtered.forEach((tx) => {
    if (tx.type !== 'expense') return;
    const categoryId = typeof tx.categoryId === 'number' ? tx.categoryId : undefined;
    if (!categoryId) return;
    const entry = perCategory.get(categoryId);
    if (!entry) {
      const fallbackCategory = categoryById.get(categoryId);
      perCategory.set(categoryId, {
        name: fallbackCategory?.name ?? `Category ${categoryId}`,
        budget: safeNumber((fallbackCategory as any)?.budget),
        spent: safeNumber(tx.amount),
      });
      return;
    }
    entry.spent += safeNumber(tx.amount);
  });

  const result = Array.from(perCategory.entries()).map(([id, entry]) => ({
    id,
    name: entry.name,
    budget: entry.budget,
    spent: entry.spent,
    percentage: entry.budget > 0 ? (entry.spent / entry.budget) * 100 : null,
  }));

  result.sort((a, b) => b.spent - a.spent);
  return typeof limitValue === 'number' ? result.slice(0, limitValue) : result;
}

function filterTransactions(
  transactions: Transaction[],
  month: string,
  categoryId?: number
): Transaction[] {
  return transactions
    .filter((tx) => {
      if (tx.type !== 'expense') return false;
      const txMonth = normalizeMonth(tx.date);
      if (month && txMonth !== month) return false;
      if (typeof categoryId === 'number') {
        return (tx.categoryId ?? null) === categoryId;
      }
      return true;
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

function matchCategory(categories: Category[], query: string): Category | null {
  const normalized = normalizeText(query);
  if (!normalized) return null;
  let exact: Category | null = null;
  let partial: Category | null = null;

  categories.forEach((category) => {
    if (!category?.name) return;
    const name = normalizeText(category.name);
    if (name === normalized) {
      exact = category;
    } else if (!partial && name.includes(normalized)) {
      partial = category;
    }
  });

  return exact ?? partial;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function clampLimit(value?: number | null): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (!Number.isFinite(value)) return undefined;
  return Math.min(Math.max(Math.round(value), 1), 10);
}

function safeNumber(value: any): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Number) {
    const parsed = value.valueOf();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function monthLabel(month: string): string {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return month;
  const formatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' });
  const date = new Date(Date.UTC(year, monthIndex, 1));
  if (Number.isNaN(date.getTime())) return month;
  return formatter.format(date);
}

async function generateNativeResponse(
  request: AppleChatNativeRequest
): Promise<AppleChatNativeResponse> {
  const module = getNativeModule();
  if (!module) {
    throw new Error('AppleBudgetChatModule is not available. Ensure iOS build completed.');
  }
  return module.generate(request);
}

export interface AppleBudgetChatResult {
  response: string;
  messages: AppleChatMessage[];
}

export async function runAppleBudgetChat(
  params: AppleBudgetChatRunParams
): Promise<AppleBudgetChatResult> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple budget chat is only available on iOS devices.');
  }

  try {
    return await runAppleBudgetChatWithFoundationModels(params);
  } catch (error) {
    if (!shouldFallbackToNativeModule(error)) {
      throw error;
    }
  }

  return runAppleBudgetChatWithNativeModule(params);
}

function shouldFallbackToNativeModule(error: unknown): boolean {
  if (!error) return false;
  const code = (error as { code?: string })?.code;
  if (code && ['MODEL_UNAVAILABLE', 'AppleLLM', 'unsupportedOS'].includes(code)) {
    return true;
  }
  const message = (error as Error)?.message ?? '';
  if (!message) return false;
  return /Apple Intelligence model is not available|FoundationModels|SystemLanguageModel|NativeAppleLLM|AppleLLM|Tool fetchBudgetContext not found/i.test(
    message
  );
}

function historyToCoreMessages(history: AppleChatMessage[]): CoreMessage[] {
  return history
    .filter((message) => message.role !== 'system')
    .map((message) => {
      if (message.role === 'user' || message.role === 'assistant') {
        return { role: message.role, content: message.content } as CoreMessage;
      }
      if (message.role === 'tool') {
        return { role: 'assistant', content: message.content } as CoreMessage;
      }
      return null;
    })
    .filter((message): message is CoreMessage => message != null);
}

function sanitizeMessages(messages: AppleChatMessage[]): AppleChatMessage[] {
  return messages.filter((message) => {
    if (message.role === 'system' || message.role === 'tool') return false;
    if (message.role === 'assistant' && message.content.includes(`Tool ${TOOL_NAME} invoked`)) {
      return false;
    }
    return true;
  });
}

async function runAppleBudgetChatWithFoundationModels({
  prompt,
  history = [],
  context,
  generationOptions,
}: AppleBudgetChatRunParams): Promise<AppleBudgetChatResult> {
  const systemInstruction = buildAppleSystemInstruction(context);
  const conversation: AppleChatMessage[] = [...history, { role: 'user', content: prompt }];
  const toolExecutions: { args: BudgetToolArguments; result: BudgetToolResult }[] = [];

  const budgetTool = tool({
    name: TOOL_NAME,
    description:
      'Fetch verified budget context from on-device data such as summaries, categories, or transactions.',
    inputSchema: budgetToolSchema,
    execute: async (input: BudgetToolSchemaInput) => {
      const normalizedArgs: BudgetToolArguments = { ...input };
      const toolResult = resolveBudgetToolRequest(normalizedArgs, context);
      toolExecutions.push({ args: normalizedArgs, result: toolResult });
      return toolResult.text;
    },
  }) as any;

  const provider = createAppleProvider({
    availableTools: {
      [TOOL_NAME]: budgetTool,
    },
  });

  const messages: CoreMessage[] = [
    { role: 'system', content: systemInstruction },
    ...historyToCoreMessages(history),
    { role: 'user', content: prompt },
  ];

  const result = await generateText({
    model: provider(),
    messages,
    tools: {
      [TOOL_NAME]: budgetTool,
    },
    maxOutputTokens: generationOptions?.maxTokens ?? 320,
    temperature: generationOptions?.temperature ?? 0.2,
    topP: generationOptions?.topP,
  });

  toolExecutions.forEach(({ args, result: toolResult }) => {
    conversation.push({
      role: 'assistant',
      content: `Tool ${TOOL_NAME} invoked with ${JSON.stringify(args)}`,
    });
    conversation.push({
      role: 'tool',
      name: TOOL_NAME,
      content: toolResult.text,
    });
  });

  const assistantReply = result.text?.replace(/^null\s*/i, '').trim()
    ? result.text.replace(/^null\s*/i, '').trim()
    : (toolExecutions.at(-1)?.result.text ??
      'I was unable to compose an answer from the retrieved budget data.');

  conversation.push({
    role: 'assistant',
    content: assistantReply,
  });

  return {
    response: assistantReply,
    messages: sanitizeMessages(conversation),
  };
}

async function runAppleBudgetChatWithNativeModule({
  prompt,
  history = [],
  context,
  maxToolIterations = MAX_TOOL_ITERATIONS,
  generationOptions,
}: AppleBudgetChatRunParams): Promise<AppleBudgetChatResult> {
  const systemInstruction = buildAppleSystemInstruction(context);

  const workingHistory = history.filter((message) => message.role !== 'system');
  const conversation: AppleChatMessage[] = [...workingHistory, { role: 'user', content: prompt }];

  for (let iteration = 0; iteration < Math.max(1, maxToolIterations); iteration += 1) {
    const response = await generateNativeResponse({
      instructions: systemInstruction,
      messages: conversation,
      options: generationOptions ?? { temperature: 0.2, topP: 0.9, maxTokens: 320 },
    });

    const toolCall = parseToolCall(response.content);
    if (toolCall && toolCall.name === TOOL_NAME) {
      const toolResult = resolveBudgetToolRequest(toolCall.args, context);
      conversation.push({
        role: 'assistant',
        content: `Tool ${TOOL_NAME} invoked with ${JSON.stringify(toolCall.args)}`,
      });
      conversation.push({
        role: 'tool',
        name: TOOL_NAME,
        content: toolResult.text,
      });
      continue;
    }

    conversation.push({
      role: 'assistant',
      content: response.content,
    });

    return {
      response: response.content,
      messages: sanitizeMessages(conversation),
    };
  }

  const fallbackResponse =
    'I was unable to retrieve the necessary budget data. Please refine your question or try again.';
  conversation.push({ role: 'assistant', content: fallbackResponse });
  return {
    response: fallbackResponse,
    messages: sanitizeMessages(conversation),
  };
}
