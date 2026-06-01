import { Platform } from 'react-native';
import { requireNativeModule } from 'expo';
import { createAppleProvider } from '@react-native-ai/apple';
import { generateText, tool, type CoreMessage } from 'ai';
import { z } from 'zod';

import type { Transaction } from '@/context/DataContext';
import {
  dedupeFinanceMonths,
  resolveBudgetToolRequest,
  type BudgetToolArguments,
  type BudgetToolResult,
  type FinanceAssistantContextData,
} from '@/lib/ai/financeAssistantContext';

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

export type AppleBudgetChatContext = Pick<
  FinanceAssistantContextData,
  'summary' | 'categories' | 'transactions'
>;

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
Always explain insights using plain language and reference amounts with $X,XXX.XX formatting.
Format dates like "May 25, 2026" or "May 2026".
For the mobile chat UI, prefer:
- one short takeaway line when helpful
- 2-4 short bullet points instead of dense paragraphs
- one sentence per bullet whenever possible.`;

const BASE_SYSTEM_PROMPT = `You are Apple Budget Advisor, an on-device financial coach for the Budget app.
Answer with concise, actionable guidance grounded in verified numbers.
Respect the user's privacy: never reference data that is not provided via messages or the budget tool.
Assume the current focus is the present month unless the user specifies otherwise.
Keep answers visually compact for a mobile chat surface.
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
  return dedupeFinanceMonths(transactions);
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
