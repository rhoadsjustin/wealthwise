import type { AppleFinanceTransaction } from '@/lib/appleFinance';

import type { Transaction } from '@/context/DataContext';

export interface ImportedTransactionDraft {
  description: string;
  amount: string;
  type: 'income' | 'expense';
  date: string;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildDedupKey(parts: { description: string; amount: string; date: string }) {
  return `${parts.date}|${parts.amount}|${normalizeText(parts.description)}`;
}

export function mapAppleFinanceTransactionToDraft(
  transaction: AppleFinanceTransaction
): ImportedTransactionDraft {
  const description =
    transaction.merchantName?.trim() ||
    transaction.description?.trim() ||
    transaction.originalDescription?.trim() ||
    'Apple Card transaction';
  const amount = transaction.amount.amount;
  const type = transaction.creditDebitIndicator.toLowerCase() === 'credit' ? 'income' : 'expense';
  const date = (transaction.postedDate ?? transaction.transactionDate).split('T')[0] ?? '';

  return {
    description,
    amount,
    type,
    date,
  };
}

export function buildExistingTransactionDedupSet(transactions: Transaction[]) {
  const dedupSet = new Set<string>();

  transactions.forEach((transaction) => {
    dedupSet.add(
      buildDedupKey({
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
      })
    );
  });

  return dedupSet;
}

export function buildImportedDraftDedupKey(transaction: ImportedTransactionDraft) {
  return buildDedupKey(transaction);
}

export function buildImportedTransactionDedupKey(transaction: AppleFinanceTransaction) {
  const draft = mapAppleFinanceTransactionToDraft(transaction);
  return buildDedupKey(draft);
}
