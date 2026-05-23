import React, { useMemo, useState } from 'react';
import { Keyboard, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';

import { Button } from '@/components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { Input } from '@/components/Input';
import { useAppData } from '@/app/_layout';
import { useData, type Category } from '@/context/DataContext';
import { useToast } from '@/context/useToast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/Select';
import {
  buildExistingTransactionDedupSet,
  buildImportedDraftDedupKey,
  type ImportedTransactionDraft,
} from '@/lib/appleFinanceImport';
import { extractTransactionsWithAppleAI } from '@/lib/ai/appleTransactionImport';
import {
  extractTextFromImage,
  extractTextFromPdf,
  scanTextWithCamera,
} from '@/lib/documentImportNative';
import { formatCurrency } from '@/lib/utils';
import { looksLikeCsv, parseCsvTransactionDrafts } from '@/lib/transactionImport';

const screenOptions = { headerShown: false } as const;

type ImportMode = 'csv' | 'statement';
type PreviewImportTransaction = ImportedTransactionDraft & {
  id: string;
  categoryId: number | null;
  suggestedCategoryId: number | null;
  categoryConfidence: number | null;
};

export default function TransactionImportModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getTransactions, getCategories, createTransaction, isInitialized } = useData();
  const { refreshAppData } = useAppData();
  const { showToast } = useToast();

  const [mode, setMode] = useState<ImportMode>('csv');
  const [rawInput, setRawInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parseMethod, setParseMethod] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [previewTransactions, setPreviewTransactions] = useState<PreviewImportTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<PreviewImportTransaction | null>(null);

  const previewRows = useMemo(
    () =>
      previewTransactions.map((transaction) => {
        const key = buildImportedDraftDedupKey(transaction);
        return {
          id: transaction.id,
          dedupeKey: key,
          transaction,
          isDuplicate: existingKeys.has(key),
          isSelected: selectedIds.has(transaction.id),
        };
      }),
    [existingKeys, previewTransactions, selectedIds]
  );

  const importableRows = previewRows.filter((row) => !row.isDuplicate);
  const editingTransaction = previewTransactions.find(
    (transaction) => transaction.id === editingTransactionId
  );

  const parseImportedInput = async (input: string, sourceMode: ImportMode) => {
    setIsParsing(true);
    setParseWarnings([]);
    setPreviewTransactions([]);
    setSelectedIds(new Set());
    setEditingTransactionId(null);
    setEditingValues(null);

    try {
      const [existingTransactions, categories] = await Promise.all([
        getTransactions(),
        getCategories(),
      ]);
      const dedupSet = buildExistingTransactionDedupSet(existingTransactions);
      setExistingKeys(dedupSet);
      setCategories(categories);

      let transactions: ImportedTransactionDraft[] = [];
      let warnings: string[] = [];
      let method: string = sourceMode;

      if (sourceMode === 'csv' && looksLikeCsv(input)) {
        const result = parseCsvTransactionDrafts(input);
        transactions = result.transactions;
        warnings = result.warnings;
        method = 'csv';
      }

      if (!transactions.length) {
        const aiTransactions = await extractTransactionsWithAppleAI(input);
        transactions = aiTransactions;
        method = 'apple-ai';
      }

      const { suggestCategory } = await import('@/lib/ai/categorizer');
      const uniqueTransactions = await Promise.all(
        dedupeParsedTransactions(transactions).map(async (transaction, index) => {
          let suggestedCategoryId: number | null = null;
          let categoryConfidence: number | null = null;

          if (transaction.type === 'expense') {
            try {
              const suggestion = await suggestCategory(
                { description: transaction.description },
                categories as any
              );
              suggestedCategoryId = suggestion.categoryId ?? null;
              categoryConfidence = suggestion.categoryId ? suggestion.confidence : null;
            } catch {}
          }

          return {
            ...transaction,
            id: createPreviewId(index),
            categoryId: suggestedCategoryId,
            suggestedCategoryId,
            categoryConfidence,
          };
        })
      );
      setPreviewTransactions(uniqueTransactions);
      setParseWarnings(warnings);
      setParseMethod(method);
      setSelectedIds(
        new Set(
          uniqueTransactions
            .filter((transaction) => !dedupSet.has(buildImportedDraftDedupKey(transaction)))
            .map((transaction) => transaction.id)
        )
      );

      if (!uniqueTransactions.length) {
        showToast.info(
          'No transactions found',
          'Try a cleaner CSV export or paste more complete statement text.'
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to parse the imported statement.';
      setParseWarnings([message]);
      showToast.error('Import parse failed', message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleParse = async () => {
    if (!isInitialized) return;

    const trimmedInput = rawInput.trim();
    if (!trimmedInput) {
      showToast.info('Nothing to parse', 'Paste CSV contents or copied statement text first.');
      return;
    }

    Keyboard.dismiss();
    await parseImportedInput(trimmedInput, mode);
  };

  const handlePickDocument = async () => {
    setIsLoadingSource(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['text/*', 'text/csv', 'application/pdf', 'application/vnd.ms-excel'],
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0]!;
      const lowerName = asset.name.toLowerCase();
      const isPdf = asset.mimeType === 'application/pdf' || lowerName.endsWith('.pdf');
      const extractedText = isPdf
        ? await extractTextFromPdf(asset.uri)
        : await FileSystemLegacy.readAsStringAsync(asset.uri);

      const nextMode: ImportMode = looksLikeCsv(extractedText) ? 'csv' : 'statement';
      setMode(nextMode);
      setRawInput(extractedText);
      await parseImportedInput(extractedText, nextMode);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open the selected file.';
      showToast.error('File import failed', message);
    } finally {
      setIsLoadingSource(false);
    }
  };

  const handlePickImage = async () => {
    setIsLoadingSource(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast.info(
          'Photos permission needed',
          'Allow photo access to import a screenshot or receipt image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const extractedText = await extractTextFromImage(result.assets[0]!.uri);
      setMode('statement');
      setRawInput(extractedText);
      await parseImportedInput(extractedText, 'statement');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to extract text from the selected image.';
      showToast.error('Image import failed', message);
    } finally {
      setIsLoadingSource(false);
    }
  };

  const handleLiveScan = async () => {
    setIsLoadingSource(true);
    try {
      const scannedText = await scanTextWithCamera();
      setMode('statement');
      setRawInput(scannedText);
      await parseImportedInput(scannedText, 'statement');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to scan text from the camera.';
      if (message === 'Scanning was cancelled.') {
        return;
      }
      showToast.error('Live scan failed', message);
    } finally {
      setIsLoadingSource(false);
    }
  };

  const handleImport = async () => {
    const rowsToImport = previewRows.filter((row) => !row.isDuplicate && row.isSelected);
    if (!rowsToImport.length) {
      showToast.info('Nothing selected', 'Choose at least one new transaction to import.');
      return;
    }

    setIsImporting(true);
    try {
      for (const row of rowsToImport) {
        await createTransaction({
          description: row.transaction.description,
          amount: row.transaction.amount,
          type: row.transaction.type,
          date: row.transaction.date,
          categoryId: row.transaction.categoryId,
        });
      }

      await refreshAppData();
      showToast.success(
        'Import complete',
        `${rowsToImport.length} transaction${rowsToImport.length === 1 ? '' : 's'} imported.`
      );
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transaction import failed.';
      showToast.error('Import failed', message);
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openEditor = (id: string) => {
    const transaction = previewTransactions.find((item) => item.id === id);
    if (!transaction) return;

    setEditingTransactionId(id);
    setEditingValues({ ...transaction });
  };

  const saveEditingTransaction = () => {
    if (!editingTransactionId || !editingValues) return;

    const normalized = normalizeEditedTransaction(editingValues);
    if (!normalized) {
      showToast.info(
        'Check transaction details',
        'Merchant, date, and a positive amount are required.'
      );
      return;
    }

    setPreviewTransactions((current) =>
      current.map((transaction) =>
        transaction.id === editingTransactionId ? { ...transaction, ...normalized } : transaction
      )
    );
    setEditingValues(normalized);
    showToast.success('Review updated', 'The imported transaction was corrected before import.');
  };

  const closeEditor = () => {
    setEditingTransactionId(null);
    setEditingValues(null);
  };

  const topPadding = Math.max(insets.top + 8, 24);
  const bottomPadding = Math.max(insets.bottom + 18, 28);

  return (
    <View className="flex-1 bg-app-background">
      <Stack.Screen options={screenOptions} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: topPadding, paddingBottom: bottomPadding }}
        keyboardShouldPersistTaps="handled">
        <View className="px-5">
          <View className="mb-5 flex-row items-center justify-between">
            <View className="pr-4">
              <Text className="text-xl font-semibold text-app-text">Import transactions</Text>
              <Text className="mt-1 text-xs text-app-text-muted">
                Paste text, pick a file or photo, or scan statement text live with the camera.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityLabel="Close transaction import"
              className="h-10 w-10 items-center justify-center rounded-full border border-app-border bg-app-surface shadow-xs">
              <Ionicons name="close" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle variant="small">Source</CardTitle>
              <CardDescription>
                CSV is parsed directly first. Statement or PDF text falls back to Apple&apos;s
                on-device model for extraction after text capture.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <View className="flex-row gap-2">
                <SourceChip label="CSV" selected={mode === 'csv'} onPress={() => setMode('csv')} />
                <SourceChip
                  label="Statement / PDF text"
                  selected={mode === 'statement'}
                  onPress={() => setMode('statement')}
                />
              </View>

              <View className="mt-4 gap-3">
                <Button
                  variant="outline"
                  title={isLoadingSource ? 'Opening…' : 'Pick CSV, TXT, or PDF file'}
                  loading={isLoadingSource}
                  onPress={handlePickDocument}
                />
                <Button
                  variant="outline"
                  title={
                    isLoadingSource ? 'Opening…' : 'Pick statement screenshot or receipt photo'
                  }
                  disabled={isLoadingSource}
                  onPress={handlePickImage}
                />
                <Button
                  variant="outline"
                  title={isLoadingSource ? 'Opening…' : 'Scan live with camera'}
                  disabled={isLoadingSource}
                  onPress={handleLiveScan}
                />
              </View>

              <Input
                className="mt-4"
                style={{ minHeight: 220 }}
                size="lg"
                multiline
                numberOfLines={12}
                autoCapitalize="none"
                autoCorrect={false}
                value={rawInput}
                onChangeText={setRawInput}
                placeholder={
                  mode === 'csv'
                    ? 'Paste your CSV contents here, including the header row.'
                    : 'Paste copied statement text here. This works well with text copied from a PDF statement.'
                }
                helperText={
                  mode === 'csv'
                    ? 'Accepted headers include Date, Description, Amount, Debit, and Credit.'
                    : 'Apple on-device AI will extract rows into dates, descriptions, amounts, and types.'
                }
              />

              <Button
                className="mt-4"
                title={isParsing ? 'Parsing…' : 'Build import preview'}
                loading={isParsing}
                onPress={handleParse}
              />
            </CardContent>
          </Card>

          {parseWarnings.length ? (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle variant="small">Warnings</CardTitle>
              </CardHeader>
              <CardContent>
                <View className="gap-2">
                  {parseWarnings.map((warning) => (
                    <Text key={warning} className="text-sm leading-5 text-warning-700">
                      {warning}
                    </Text>
                  ))}
                </View>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle variant="small">Preview</CardTitle>
              <CardDescription>
                {parseMethod
                  ? `Parsed ${previewTransactions.length} row${previewTransactions.length === 1 ? '' : 's'} with ${parseMethod}. Duplicates are excluded from import.`
                  : 'No preview yet.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!previewRows.length ? (
                <View className="rounded-2xl border border-dashed border-app-border bg-app-surface-alt px-4 py-6">
                  <Text className="text-sm leading-6 text-app-text-muted">
                    Paste a statement and build the preview to review imported rows here.
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {previewRows.map((row) => (
                    <View
                      key={row.id}
                      className={`rounded-2xl border px-4 py-3 ${
                        row.isDuplicate
                          ? 'border-border-default bg-background-secondary opacity-70'
                          : row.isSelected
                            ? 'border-primary-400 bg-primary-50'
                            : 'border-app-border bg-app-surface-alt'
                      }`}>
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <TouchableOpacity
                              onPress={() => !row.isDuplicate && toggleSelection(row.id)}
                              disabled={row.isDuplicate}
                              className={`h-6 w-6 items-center justify-center rounded-full border ${
                                row.isSelected
                                  ? 'border-primary-500 bg-primary-500'
                                  : 'border-app-border bg-app-surface'
                              }`}>
                              {row.isSelected ? (
                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                              ) : null}
                            </TouchableOpacity>
                            <Text className="text-sm font-semibold text-app-text">
                              {row.transaction.description}
                            </Text>
                          </View>
                          <Text className="mt-1 text-xs text-app-text-muted">
                            {row.transaction.date} · {row.transaction.type}
                          </Text>
                          <Text className="mt-1 text-xs text-app-text-muted">
                            Category:{' '}
                            {categoryLabel(row.transaction.categoryId, categories) ??
                              'Uncategorized'}
                            {row.transaction.suggestedCategoryId &&
                            row.transaction.categoryId === row.transaction.suggestedCategoryId &&
                            row.transaction.categoryConfidence
                              ? ` · Suggested ${Math.round(row.transaction.categoryConfidence * 100)}%`
                              : ''}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-sm font-semibold text-app-text">
                            {formatCurrency(Number.parseFloat(row.transaction.amount))}
                          </Text>
                          <Text
                            className={`mt-1 text-xs ${
                              row.isDuplicate ? 'text-warning-700' : 'text-app-text-muted'
                            }`}>
                            {row.isDuplicate
                              ? 'Already imported'
                              : row.isSelected
                                ? 'Selected'
                                : 'Tap to select'}
                          </Text>
                          {!row.isDuplicate ? (
                            <TouchableOpacity
                              onPress={() => openEditor(row.id)}
                              className="mt-2 rounded-full border border-app-border bg-app-surface px-3 py-1.5">
                              <Text className="text-xs font-medium text-app-text">Review</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </CardContent>
          </Card>

          {editingTransaction && editingValues ? (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle variant="small">Review and correct</CardTitle>
                <CardDescription>
                  Fix merchant, date, amount, or transaction type before import.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  <Input
                    label="Merchant or description"
                    value={editingValues.description}
                    onChangeText={(value) =>
                      setEditingValues((current) =>
                        current ? { ...current, description: value } : current
                      )
                    }
                    placeholder="Merchant name"
                  />
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Input
                        label="Date"
                        value={editingValues.date}
                        onChangeText={(value) =>
                          setEditingValues((current) =>
                            current ? { ...current, date: value } : current
                          )
                        }
                        placeholder="YYYY-MM-DD"
                        autoCapitalize="none"
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="Amount"
                        value={editingValues.amount}
                        onChangeText={(value) =>
                          setEditingValues((current) =>
                            current
                              ? {
                                  ...current,
                                  amount: value.replace(/[^0-9.]/g, ''),
                                }
                              : current
                          )
                        }
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <SourceChip
                      label="Expense"
                      selected={editingValues.type === 'expense'}
                      onPress={() =>
                        setEditingValues((current) =>
                          current ? { ...current, type: 'expense' } : current
                        )
                      }
                    />
                    <SourceChip
                      label="Income"
                      selected={editingValues.type === 'income'}
                      onPress={() =>
                        setEditingValues((current) =>
                          current ? { ...current, type: 'income' } : current
                        )
                      }
                    />
                  </View>
                  <View>
                    <Text className="mb-2 text-sm font-medium text-app-text">Category</Text>
                    <Select
                      value={
                        editingValues.categoryId != null
                          ? String(editingValues.categoryId)
                          : 'uncategorized'
                      }
                      onValueChange={(value) =>
                        setEditingValues((current) =>
                          current
                            ? {
                                ...current,
                                categoryId:
                                  value === 'uncategorized' ? null : Number.parseInt(value, 10),
                              }
                            : current
                        )
                      }>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a category">
                          {categoryLabel(editingValues.categoryId, categories) ?? 'Uncategorized'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uncategorized">
                          <Text className="text-sm text-app-text">Uncategorized</Text>
                        </SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            <Text className="text-sm text-app-text">{category.name}</Text>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editingValues.suggestedCategoryId ? (
                      <Text className="mt-2 text-xs text-app-text-muted">
                        Suggested:{' '}
                        {categoryLabel(editingValues.suggestedCategoryId, categories) ??
                          'Uncategorized'}
                        {editingValues.categoryConfidence
                          ? ` (${Math.round(editingValues.categoryConfidence * 100)}%)`
                          : ''}
                      </Text>
                    ) : null}
                  </View>
                  <View className="flex-row gap-3">
                    <Button
                      className="flex-1"
                      variant="outline"
                      title="Close review"
                      onPress={closeEditor}
                    />
                    <Button
                      className="flex-1"
                      title="Save correction"
                      onPress={saveEditingTransaction}
                    />
                  </View>
                </View>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <View className="px-5" style={{ paddingBottom: bottomPadding, paddingTop: 12 }}>
        <Button
          className="w-full"
          size="lg"
          title={
            isImporting
              ? 'Importing…'
              : `Import selected (${importableRows.filter((row) => row.isSelected).length})`
          }
          loading={isImporting}
          disabled={!importableRows.some((row) => row.isSelected) || isParsing || isLoadingSource}
          onPress={handleImport}
        />
      </View>
    </View>
  );
}

function SourceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`rounded-full border px-4 py-2 ${
        selected ? 'border-primary-400 bg-primary-50' : 'border-app-border bg-app-surface-alt'
      }`}>
      <Text
        className={selected ? 'text-sm font-semibold text-primary-700' : 'text-sm text-app-text'}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function dedupeParsedTransactions(transactions: ImportedTransactionDraft[]) {
  const seen = new Set<string>();
  const unique: ImportedTransactionDraft[] = [];

  transactions.forEach((transaction) => {
    const key = buildImportedDraftDedupKey(transaction);
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(transaction);
  });

  return unique;
}

function createPreviewId(index: number) {
  return `preview-${Date.now()}-${index}`;
}

function normalizeEditedTransaction(
  transaction: PreviewImportTransaction
): PreviewImportTransaction | null {
  const description = transaction.description.trim();
  const date = normalizeReviewDate(transaction.date);
  const amountValue = Number.parseFloat(transaction.amount.replace(/[^0-9.]/g, ''));

  if (!description || !date || !Number.isFinite(amountValue) || amountValue <= 0) {
    return null;
  }

  return {
    id: transaction.id,
    description,
    date,
    amount: amountValue.toFixed(2),
    type: transaction.type,
    categoryId: transaction.categoryId,
    suggestedCategoryId: transaction.suggestedCategoryId,
    categoryConfidence: transaction.categoryConfidence,
  };
}

function normalizeReviewDate(value: string) {
  const trimmed = value.trim();
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (!isoMatch) return null;
  return `${isoMatch[1]}-${isoMatch[2]!.padStart(2, '0')}-${isoMatch[3]!.padStart(2, '0')}`;
}

function categoryLabel(categoryId: number | null, categories: Category[]) {
  if (categoryId == null) return null;
  return categories.find((category) => category.id === categoryId)?.name ?? null;
}
