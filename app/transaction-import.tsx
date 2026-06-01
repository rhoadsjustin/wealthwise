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
import { useActivityData, useAppData } from '@/app/_layout';
import { useData, type Category } from '@/context/DataContext';
import { useToast } from '@/context/useToast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/Select';
import {
  buildExistingTransactionDedupSet,
  buildImportedDraftDedupKey,
} from '@/lib/appleFinanceImport';
import {
  extractPdfPages,
  extractTextFromImage,
  scanTextWithCamera,
} from '@/lib/documentImportNative';
import type {
  ImportCapturePayload,
  ImportParseMethod,
  ImportPreviewRow,
  ImportWarning,
} from '@/lib/schema/schema';
import { buildImportPreview } from '@/lib/transactionImportPreview';
import { formatCurrency } from '@/lib/utils';
import { looksLikeCsv } from '@/lib/transactionImport';

const screenOptions = { headerShown: false } as const;

type ImportMode = 'csv' | 'statement';

export default function TransactionImportModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getTransactions, getCategories, createTransaction, isInitialized } = useData();
  const { refreshActivityData } = useActivityData();
  const { refreshSummaryData } = useAppData();
  const { showToast } = useToast();

  const [mode, setMode] = useState<ImportMode>('csv');
  const [rawInput, setRawInput] = useState('');
  const [isInputExpanded, setIsInputExpanded] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const [showWarningDetails, setShowWarningDetails] = useState(false);
  const [lastPayload, setLastPayload] = useState<ImportCapturePayload | null>(null);
  const [parseWarnings, setParseWarnings] = useState<ImportWarning[]>([]);
  const [parseMethods, setParseMethods] = useState<ImportParseMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [previewTransactions, setPreviewTransactions] = useState<ImportPreviewRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<ImportPreviewRow | null>(null);

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

  const importableRows = useMemo(
    () => previewRows.filter((row) => !row.isDuplicate),
    [previewRows]
  );
  const selectedImportableCount = importableRows.filter((row) => row.isSelected).length;
  const duplicateCount = previewRows.length - importableRows.length;
  const editingTransaction = previewTransactions.find(
    (transaction) => transaction.id === editingTransactionId
  );
  const warningCount = parseWarnings.filter((warning) => warning.severity === 'warning').length;

  const parseImportedPayload = async (payload: ImportCapturePayload) => {
    setIsParsing(true);
    setParseWarnings([]);
    setShowWarningDetails(false);
    setPreviewTransactions([]);
    setSelectedIds(new Set());
    setEditingTransactionId(null);
    setEditingValues(null);

    try {
      const [existingTransactions, nextCategories] = await Promise.all([
        getTransactions(),
        getCategories(),
      ]);
      const dedupSet = buildExistingTransactionDedupSet(existingTransactions);
      setExistingKeys(dedupSet);
      setCategories(nextCategories);
      setLastPayload(payload);

      const result = await buildImportPreview({
        payload,
        categories: nextCategories,
      });

      setPreviewTransactions(result.rows);
      setParseWarnings(result.warnings);
      setParseMethods(result.methods);
      setSelectedIds(
        new Set(
          result.rows
            .filter((transaction) => !dedupSet.has(buildImportedDraftDedupKey(transaction)))
            .map((transaction) => transaction.id)
        )
      );
      setIsInputExpanded(result.rows.length === 0);

      if (!result.rows.length) {
        showToast.info(
          'No transactions found',
          'Try a cleaner export, a shorter page range, or correct the text before parsing again.'
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to parse the imported statement.';
      setParseWarnings([
        {
          code: 'parse_failed',
          message,
          severity: 'warning',
        },
      ]);
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
    await parseImportedPayload(buildTextPayload(trimmedInput, mode));
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

      if (isPdf) {
        const pdfPages = await extractPdfPages(asset.uri);
        const payload = buildPdfPayload(asset.name, pdfPages);
        setMode('statement');
        setRawInput(payload.rawText);
        await parseImportedPayload(payload);
        return;
      }

      const extractedText = await FileSystemLegacy.readAsStringAsync(asset.uri);
      const nextMode: ImportMode = looksLikeCsv(extractedText) ? 'csv' : 'statement';
      setMode(nextMode);
      setRawInput(extractedText);
      await parseImportedPayload({
        ...buildTextPayload(extractedText, nextMode),
        fileName: asset.name,
      });
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
      const payload: ImportCapturePayload = {
        source: 'image',
        rawText: extractedText,
        fileName: result.assets[0]!.fileName ?? 'Selected image',
        chunks: [
          {
            id: 'image-1',
            source: 'image',
            label: 'Photo OCR',
            text: extractedText,
          },
        ],
      };

      setMode('statement');
      setRawInput(extractedText);
      await parseImportedPayload(payload);
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
      const payload: ImportCapturePayload = {
        source: 'scan',
        rawText: scannedText,
        chunks: [
          {
            id: 'scan-1',
            source: 'scan',
            label: 'Live scan',
            text: scannedText,
          },
        ],
      };

      setMode('statement');
      setRawInput(scannedText);
      await parseImportedPayload(payload);
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

      await Promise.all([refreshActivityData(), refreshSummaryData()]);
      showToast.success(
        'Import complete',
        `${rowsToImport.length} transaction${rowsToImport.length === 1 ? '' : 's'} imported.`
      );
      router.replace('/activity' as any);
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
    setEditingTransactionId(null);
    setEditingValues(null);
    showToast.success('Review updated', 'The imported transaction was corrected before import.');
  };

  const closeEditor = () => {
    setEditingTransactionId(null);
    setEditingValues(null);
  };

  const selectAllNew = () => {
    setSelectedIds(new Set(importableRows.map((row) => row.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const topPadding = Math.max(insets.top + 8, 24);
  const bottomPadding = Math.max(insets.bottom + 20, 32);
  const footerHeight = 112;

  return (
    <View className="flex-1 bg-app-canvas">
      <Stack.Screen options={screenOptions} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: bottomPadding + footerHeight,
        }}
        keyboardShouldPersistTaps="handled">
        <View className="px-5">
          <View className="relative mb-5 pr-14">
            <View className="pr-2">
              <Text className="text-3xl font-semibold text-app-text-strong">Statement import</Text>
              <Text className="mt-2 text-sm leading-7 text-app-text-faint">
                Capture text, review extracted rows, then import only the transactions you trust.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityLabel="Close transaction import"
              className="absolute right-0 top-0 h-11 w-11 items-center justify-center rounded-full border border-app-border bg-app-surface-1">
              <Ionicons name="close" size={18} color="#F8FAFC" />
            </TouchableOpacity>
          </View>

          <View className="mb-5 flex-row gap-2">
            <StepPill label="1. Capture" active />
            <StepPill label="2. Review" active={previewRows.length > 0} />
            <StepPill label="3. Import" active={previewRows.length > 0} />
          </View>

          <Card variant="glass-dark" className="mb-5">
            <CardHeader className="pb-3">
              <CardTitle variant="small">Capture</CardTitle>
              <CardDescription>
                PDFs are handled page by page first. CSV imports stay direct, and harder chunks only
                fall back to on-device AI when needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <View className="flex-row flex-wrap gap-2">
                <ModeChip label="CSV" selected={mode === 'csv'} onPress={() => setMode('csv')} />
                <ModeChip
                  label="Statement / PDF text"
                  selected={mode === 'statement'}
                  onPress={() => setMode('statement')}
                />
              </View>

              <View className="mt-4 gap-3">
                <SourceActionTile
                  icon="document-text-outline"
                  title={isLoadingSource ? 'Opening…' : 'Pick CSV, TXT, or PDF'}
                  subtitle="Best for bank exports and long statements"
                  disabled={isLoadingSource}
                  onPress={handlePickDocument}
                />
                <SourceActionTile
                  icon="image-outline"
                  title={isLoadingSource ? 'Opening…' : 'Pick statement screenshot or receipt'}
                  subtitle="Runs OCR on a saved photo"
                  disabled={isLoadingSource}
                  onPress={handlePickImage}
                />
                <SourceActionTile
                  icon="scan-outline"
                  title={isLoadingSource ? 'Opening…' : 'Scan live with camera'}
                  subtitle="Use live text capture for a printed page"
                  disabled={isLoadingSource}
                  onPress={handleLiveScan}
                />
              </View>

              {previewRows.length ? (
                <TouchableOpacity
                  onPress={() => setIsInputExpanded((current) => !current)}
                  className="mt-4 flex-row items-center justify-between rounded-2xl border border-app-border bg-app-canvas-elevated px-4 py-3">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-app-text-strong">
                      {isInputExpanded ? 'Hide raw capture text' : 'Show raw capture text'}
                    </Text>
                    <Text className="mt-1 text-xs leading-5 text-app-text-faint">
                      {lastPayload?.chunks.length
                        ? `${lastPayload.chunks.length} chunk${lastPayload.chunks.length === 1 ? '' : 's'} ready for review`
                        : 'Expand to inspect or edit the captured text'}
                    </Text>
                  </View>
                  <Ionicons
                    name={isInputExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              ) : null}

              {isInputExpanded ? (
                <Input
                  className="mt-4"
                  style={{ minHeight: 184 }}
                  variant="dark"
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
                      : 'Paste, file import, and OCR all land in the same preview pipeline.'
                  }
                />
              ) : null}

              <Button
                className="mb-1 mt-5"
                variant="primary-solid"
                title={isParsing ? 'Building preview…' : 'Build import preview'}
                loading={isParsing}
                onPress={handleParse}
              />
            </CardContent>
          </Card>

          {parseWarnings.length ? (
            <Card variant="inset" className="mb-5">
              <CardHeader className="pb-3">
                <CardTitle variant="small">Parser notes</CardTitle>
                <CardDescription>
                  {warningCount
                    ? `${warningCount} warning${warningCount === 1 ? '' : 's'} need attention before import.`
                    : 'The parser recovered, but there are a few details worth reviewing.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  {parseWarnings
                    .slice(0, showWarningDetails ? parseWarnings.length : 3)
                    .map((warning) => (
                      <View
                        key={`${warning.code}-${warning.chunkId ?? 'general'}-${warning.message}`}
                        className={`rounded-2xl border px-4 py-3 ${
                          warning.severity === 'warning'
                            ? 'border-warning-500/40 bg-warning-500/10'
                            : 'border-app-border bg-app-canvas-elevated'
                        }`}>
                        <Text
                          className={`text-sm font-medium ${
                            warning.severity === 'warning'
                              ? 'text-warning-700'
                              : 'text-app-text-strong'
                          }`}>
                          {warning.chunkLabel ? `${warning.chunkLabel}: ` : ''}
                          {warning.message}
                        </Text>
                      </View>
                    ))}

                  {parseWarnings.length > 3 ? (
                    <TouchableOpacity
                      onPress={() => setShowWarningDetails((current) => !current)}
                      className="self-start rounded-full border border-app-border px-3 py-2">
                      <Text className="text-xs font-medium text-app-text-soft">
                        {showWarningDetails
                          ? 'Show fewer notes'
                          : `Show all ${parseWarnings.length} notes`}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </CardContent>
            </Card>
          ) : null}

          <Card variant="glass-dark" className="mb-5">
            <CardHeader className="pb-3">
              <CardTitle variant="small">Review</CardTitle>
              <CardDescription>
                {parseMethods.length
                  ? `${previewTransactions.length} row${previewTransactions.length === 1 ? '' : 's'} extracted via ${formatMethodList(parseMethods)}. Duplicates stay out of the import count.`
                  : 'Build a preview to review imported rows here.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!previewRows.length ? (
                <View className="rounded-2xl border border-dashed border-app-border bg-app-canvas-elevated px-4 py-6">
                  <Text className="text-sm leading-6 text-app-text-faint">
                    Capture a statement, then review merchant, date, category, and amount here
                    before importing into Activity.
                  </Text>
                </View>
              ) : (
                <View className="gap-4">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <MiniStat label="New" value={String(importableRows.length)} />
                    <MiniStat label="Selected" value={String(selectedImportableCount)} />
                    <MiniStat label="Duplicates" value={String(duplicateCount)} />
                    {lastPayload?.chunks.length ? (
                      <MiniStat label="Chunks" value={String(lastPayload.chunks.length)} />
                    ) : null}
                  </View>

                  <View className="flex-row gap-2">
                    <Button
                      className="flex-1"
                      variant="secondary-muted"
                      size="sm"
                      title="Select all new"
                      onPress={selectAllNew}
                    />
                    <Button
                      className="flex-1"
                      variant="secondary-muted"
                      size="sm"
                      title="Clear"
                      onPress={clearSelection}
                    />
                  </View>

                  <View className="gap-3">
                    {previewRows.map((row) => (
                      <View
                        key={row.id}
                        className={`rounded-3xl border px-4 py-4 ${
                          row.isDuplicate
                            ? 'border-app-border bg-app-canvas-elevated opacity-70'
                            : row.isSelected
                              ? 'border-app-border-contrast bg-app-surface-2'
                              : 'border-app-border bg-app-surface-1'
                        }`}>
                        <View className="flex-row items-start gap-3">
                          <TouchableOpacity
                            onPress={() => !row.isDuplicate && toggleSelection(row.id)}
                            disabled={row.isDuplicate}
                            className={`mt-0.5 h-6 w-6 items-center justify-center rounded-full border ${
                              row.isSelected
                                ? 'border-accent-savings bg-accent-savings'
                                : 'border-app-border bg-app-canvas-elevated'
                            }`}>
                            {row.isSelected ? (
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            ) : null}
                          </TouchableOpacity>

                          <View className="flex-1">
                            <View className="flex-row items-start justify-between gap-3">
                              <View className="flex-1">
                                <Text className="text-base font-semibold text-app-text-strong">
                                  {row.transaction.description}
                                </Text>
                                <Text className="mt-1 text-xs leading-5 text-app-text-faint">
                                  {row.transaction.date} · {row.transaction.type} ·{' '}
                                  {row.transaction.sourceLabel ?? 'Imported text'}
                                </Text>
                              </View>
                              <Text className="text-base font-semibold text-app-text-strong">
                                {formatCurrency(Number.parseFloat(row.transaction.amount))}
                              </Text>
                            </View>

                            <View className="mt-3 flex-row flex-wrap gap-2">
                              <Badge
                                label={
                                  categoryLabel(row.transaction.categoryId, categories) ??
                                  'Uncategorized'
                                }
                              />
                              <Badge
                                label={
                                  row.isDuplicate
                                    ? 'Already logged'
                                    : row.transaction.parseMethod === 'apple-ai'
                                      ? 'AI assisted'
                                      : row.transaction.parseMethod === 'csv'
                                        ? 'CSV parsed'
                                        : 'Direct parsed'
                                }
                                tone={row.isDuplicate ? 'muted' : 'default'}
                              />
                              {row.transaction.suggestedCategoryId &&
                              row.transaction.categoryId === row.transaction.suggestedCategoryId &&
                              row.transaction.categoryConfidence ? (
                                <Badge
                                  label={`Suggested ${Math.round(
                                    row.transaction.categoryConfidence * 100
                                  )}%`}
                                  tone="success"
                                />
                              ) : null}
                            </View>

                            <View className="mt-3 flex-row gap-2">
                              {!row.isDuplicate ? (
                                <Button
                                  className="flex-1"
                                  variant="secondary-muted"
                                  size="sm"
                                  title={row.isSelected ? 'Selected' : 'Select'}
                                  onPress={() => toggleSelection(row.id)}
                                />
                              ) : null}
                              <Button
                                className="flex-1"
                                variant="pill"
                                size="sm"
                                title="Review row"
                                onPress={() => openEditor(row.id)}
                              />
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </CardContent>
          </Card>

          {editingTransaction && editingValues ? (
            <Card variant="glass-dark" className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle variant="small">Edit selected row</CardTitle>
                <CardDescription>
                  Fix the merchant, date, amount, type, or category before import.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  <Input
                    variant="dark"
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
                        variant="dark"
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
                        variant="dark"
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
                    <ModeChip
                      label="Expense"
                      selected={editingValues.type === 'expense'}
                      onPress={() =>
                        setEditingValues((current) =>
                          current ? { ...current, type: 'expense' } : current
                        )
                      }
                    />
                    <ModeChip
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
                    <Text className="mb-2 text-sm font-medium text-app-text-soft">Category</Text>
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
                      variant="secondary-muted"
                      title="Close"
                      onPress={closeEditor}
                    />
                    <Button
                      className="flex-1"
                      variant="primary-solid"
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

      {previewRows.length ? (
        <View
          className="border-t border-app-border bg-app-canvas px-5 pt-4"
          style={{ paddingBottom: bottomPadding }}>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm text-app-text-faint">
              {selectedImportableCount} selected · {duplicateCount} duplicate
              {duplicateCount === 1 ? '' : 's'} skipped
            </Text>
            {parseMethods.length ? (
              <Text className="text-xs uppercase tracking-[0.12em] text-app-text-faint">
                {formatMethodList(parseMethods)}
              </Text>
            ) : null}
          </View>
          <Button
            className="w-full"
            size="lg"
            variant="primary-solid"
            title={isImporting ? 'Importing…' : `Import selected (${selectedImportableCount})`}
            loading={isImporting}
            disabled={!selectedImportableCount || isParsing || isLoadingSource}
            onPress={handleImport}
          />
        </View>
      ) : null}
    </View>
  );
}

function buildTextPayload(rawText: string, mode: ImportMode): ImportCapturePayload {
  const source = mode === 'csv' ? 'csv' : 'paste';
  return {
    source,
    rawText,
    chunks: [
      {
        id: `${source}-1`,
        source,
        label: mode === 'csv' ? 'CSV input' : 'Pasted statement text',
        text: rawText,
      },
    ],
  };
}

function buildPdfPayload(
  fileName: string,
  pages: {
    pageNumber: number;
    text: string;
  }[]
): ImportCapturePayload {
  const normalizedPages = pages
    .map((page) => ({
      id: `pdf-page-${page.pageNumber}`,
      source: 'pdf' as const,
      label: `Page ${page.pageNumber}`,
      pageNumber: page.pageNumber,
      text: page.text.trim(),
    }))
    .filter((page) => page.text.length > 0);

  return {
    source: 'pdf',
    rawText: normalizedPages.map((page) => page.text).join('\n\n'),
    fileName,
    chunks: normalizedPages,
  };
}

function normalizeEditedTransaction(transaction: ImportPreviewRow): ImportPreviewRow | null {
  const description = transaction.description.trim();
  const date = normalizeReviewDate(transaction.date);
  const amountValue = Number.parseFloat(transaction.amount.replace(/[^0-9.]/g, ''));

  if (!description || !date || !Number.isFinite(amountValue) || amountValue <= 0) {
    return null;
  }

  return {
    ...transaction,
    description,
    date,
    amount: amountValue.toFixed(2),
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

function formatMethodList(methods: ImportParseMethod[]) {
  return methods
    .map((method) => {
      switch (method) {
        case 'apple-ai':
          return 'Apple AI';
        case 'rule-based':
          return 'direct parsing';
        default:
          return 'CSV';
      }
    })
    .join(' + ');
}

function StepPill({ label, active }: { label: string; active?: boolean }) {
  return (
    <View
      className={`rounded-full border px-3 py-2 ${
        active
          ? 'border-app-border-contrast bg-app-surface-2'
          : 'border-app-border bg-app-canvas-elevated'
      }`}>
      <Text
        className={`text-xs font-medium uppercase tracking-[0.12em] ${
          active ? 'text-app-text-strong' : 'text-app-text-faint'
        }`}>
        {label}
      </Text>
    </View>
  );
}

function ModeChip({
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
      className={`min-h-[48px] rounded-full border px-4 py-2.5 ${
        selected
          ? 'border-app-border-contrast bg-app-surface-2'
          : 'border-app-border bg-app-canvas-elevated'
      }`}>
      <Text
        className={
          selected
            ? 'text-sm font-semibold leading-5 text-app-text-strong'
            : 'text-sm leading-5 text-app-text-faint'
        }>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SourceActionTile({
  icon,
  title,
  subtitle,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.85}
      className={`rounded-3xl border border-app-border bg-app-surface-2 px-4 py-4 ${
        disabled ? 'opacity-60' : ''
      }`}>
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-app-canvas-elevated">
          <Ionicons name={icon} size={20} color="#F8FAFC" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-app-text-strong">{title}</Text>
          <Text className="mt-1 text-xs leading-5 text-app-text-faint">{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

function Badge({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'success' | 'muted';
}) {
  const toneClasses =
    tone === 'success'
      ? 'border-success-500/40 bg-success-500/15 text-success-700'
      : tone === 'muted'
        ? 'border-app-border bg-app-canvas-elevated text-app-text-faint'
        : 'border-app-border bg-app-surface-2 text-app-text-soft';

  return (
    <View className={`rounded-full border px-2.5 py-1 ${toneClasses}`}>
      <Text className="text-[11px] font-medium">{label}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-2xl border border-app-border bg-app-canvas-elevated px-3 py-2">
      <Text className="text-[11px] uppercase tracking-[0.12em] text-app-text-faint">{label}</Text>
      <Text className="mt-1 text-sm font-semibold text-app-text-strong">{value}</Text>
    </View>
  );
}
