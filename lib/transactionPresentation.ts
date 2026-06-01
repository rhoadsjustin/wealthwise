import type { Category, Transaction } from '@/context/DataContext';

export function getTransactionCategoryLabel(
  transaction: Pick<Transaction, 'type' | 'categoryId'>,
  category?: Pick<Category, 'name'> | null
) {
  if (category?.name) {
    return category.name;
  }

  return transaction.type === 'income' ? 'Income' : 'Uncategorized';
}

export function transactionNeedsCategory(
  transaction: Pick<Transaction, 'type' | 'categoryId'>
) {
  return transaction.type === 'expense' && transaction.categoryId == null;
}

export function isUncategorizedTransaction(
  transaction: Pick<Transaction, 'type' | 'categoryId'>
) {
  return transactionNeedsCategory(transaction);
}
