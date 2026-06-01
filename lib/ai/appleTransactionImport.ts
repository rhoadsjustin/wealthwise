import { Platform } from 'react-native';
import { createAppleProvider } from '@react-native-ai/apple';
import { generateText } from 'ai';
import { z } from 'zod';

import type { ImportedTransactionDraft } from '@/lib/appleFinanceImport';

const rawTransactionSchema = z.object({
  date: z.string().min(8),
  description: z.string().min(1),
  amount: z.union([z.string().min(1), z.number()]),
  type: z.enum(['income', 'expense']),
});

const transactionListSchema = z.array(rawTransactionSchema);

export interface AppleAIImportResult {
  transactions: ImportedTransactionDraft[];
  recoveredNumericAmount: boolean;
}

export async function extractTransactionsWithAppleAI(
  raw: string
): Promise<ImportedTransactionDraft[]> {
  const result = await extractTransactionsWithAppleAIResult(raw);
  return result.transactions;
}

export async function extractTransactionsWithAppleAIResult(
  raw: string
): Promise<AppleAIImportResult> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple on-device import is only available on iOS.');
  }

  const provider = createAppleProvider();
  const prompt = buildStatementImportPrompt(raw);

  const result = await generateText({
    model: provider(),
    prompt,
    temperature: 0.1,
    maxOutputTokens: 1800,
  });

  const parsed = parseJsonArray(result.text);
  let recoveredNumericAmount = false;

  return {
    transactions: parsed.map((item) => {
      if (typeof item.amount === 'number') {
        recoveredNumericAmount = true;
      }

      return {
        date: normalizeDate(item.date),
        description: item.description.trim(),
        amount: normalizeAmount(item.amount),
        type: item.type,
      };
    }),
    recoveredNumericAmount,
  };
}

function buildStatementImportPrompt(raw: string) {
  const today = new Date();
  const currentYear = today.getFullYear();

  return `Extract transactions from the statement content below.

Return JSON only.
Return an array of objects with exactly these keys:
- "date": YYYY-MM-DD
- "description": merchant or transaction description
- "amount": positive decimal string with 2 decimals and no currency symbol
- "type": "expense" or "income"

Rules:
- Ignore headers, balances, totals, due dates, rewards summaries, and non-transaction rows.
- Keep charges and purchases as "expense".
- Treat refunds, credits, deposits, and payments received as "income".
- Amounts must always be positive in the JSON.
- If the statement omits the year, assume ${currentYear} unless the text clearly indicates another year.
- If a row is ambiguous, skip it instead of guessing.
- Do not include markdown fences or commentary.

Statement content:
${raw}`;
}

function parseJsonArray(value: string) {
  const arrayMatch = value.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    throw new Error('Apple Intelligence did not return a transaction list.');
  }

  const parsed = JSON.parse(arrayMatch[0]);
  return transactionListSchema.parse(parsed);
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (!isoMatch) {
    throw new Error(`Invalid imported date: ${value}`);
  }

  return `${isoMatch[1]}-${isoMatch[2]!.padStart(2, '0')}-${isoMatch[3]!.padStart(2, '0')}`;
}

function normalizeAmount(value: string | number) {
  const normalizedValue = typeof value === 'number' ? String(value) : value;
  const parsed = Number.parseFloat(normalizedValue.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid imported amount: ${normalizedValue}`);
  }

  return parsed.toFixed(2);
}
