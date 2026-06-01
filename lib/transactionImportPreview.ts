import type {
  ImportCaptureChunk,
  ImportCapturePayload,
  ImportParseMethod,
  ImportPreviewRow,
  ImportWarning,
} from '@/lib/schema/schema';
import type { Category } from '@/context/DataContext';
import {
  buildImportedDraftDedupKey,
  type ImportedTransactionDraft,
} from '@/lib/appleFinanceImport';
import { extractTransactionsWithAppleAIResult } from '@/lib/ai/appleTransactionImport';
import { looksLikeCsv, parseCsvTransactionDrafts } from '@/lib/transactionImport';

const MAX_AI_CHUNK_CHARS = 6000;
const MIN_RULE_ROWS_BEFORE_SKIPPING_AI = 2;

export interface BuildImportPreviewOptions {
  payload: ImportCapturePayload;
  categories: Category[];
}

export interface BuildImportPreviewResult {
  rows: ImportPreviewRow[];
  warnings: ImportWarning[];
  methods: ImportParseMethod[];
}

export async function buildImportPreview({
  payload,
  categories,
}: BuildImportPreviewOptions): Promise<BuildImportPreviewResult> {
  const warnings: ImportWarning[] = [];
  const methods = new Set<ImportParseMethod>();
  const chunks = normalizeChunks(payload);

  if (!payload.rawText.trim() || !chunks.length) {
    return {
      rows: [],
      warnings: [
        {
          code: 'capture_empty',
          message: 'No readable text was found in this import source.',
          severity: 'warning',
        },
      ],
      methods: [],
    };
  }

  if (payload.source === 'csv' || looksLikeCsv(payload.rawText)) {
    const result = parseCsvTransactionDrafts(payload.rawText);
    methods.add('csv');
    warnings.push(
      ...result.warnings.map((message) => ({
        code: 'parse_failed' as const,
        message,
        severity: 'warning' as const,
      }))
    );

    const rows = await addCategorySuggestions(
      result.transactions.map((transaction, index) => ({
        id: createPreviewId('csv', index),
        ...transaction,
        categoryId: null,
        suggestedCategoryId: null,
        categoryConfidence: null,
        parseMethod: 'csv' as const,
        sourceLabel: 'CSV import',
      })),
      categories
    );

    return {
      rows: dedupePreviewRows(rows, warnings),
      warnings,
      methods: [...methods],
    };
  }

  const previewRows: ImportPreviewRow[] = [];

  for (const chunk of chunks) {
    const ruleResult = parseStatementChunkRuleBased(chunk);
    previewRows.push(
      ...ruleResult.rows.map((transaction, index) => ({
        id: createPreviewId(chunk.id, index),
        ...transaction,
        categoryId: null,
        suggestedCategoryId: null,
        categoryConfidence: null,
        parseMethod: 'rule-based' as const,
        sourceChunkId: chunk.id,
        sourceLabel: chunk.label,
      }))
    );
    warnings.push(...ruleResult.warnings);

    if (ruleResult.rows.length > 0) {
      methods.add('rule-based');
    }

    if (ruleResult.rows.length >= MIN_RULE_ROWS_BEFORE_SKIPPING_AI) {
      continue;
    }

    const aiSubchunks = splitChunkForAI(chunk);
    if (aiSubchunks.length > 1) {
      warnings.push({
        code: 'chunk_split',
        message: `${chunk.label} was split into ${aiSubchunks.length} smaller parsing passes.`,
        severity: 'info',
        chunkId: chunk.id,
        chunkLabel: chunk.label,
      });
    }

    for (const [subchunkIndex, subchunk] of aiSubchunks.entries()) {
      try {
        const aiResult = await extractTransactionsWithAppleAIResult(subchunk.text);
        if (!aiResult.transactions.length) continue;

        methods.add('apple-ai');
        if (aiResult.recoveredNumericAmount) {
          warnings.push({
            code: 'model_schema_recovered',
            message: `${chunk.label} returned numeric amounts that were normalized automatically.`,
            severity: 'info',
            chunkId: chunk.id,
            chunkLabel: chunk.label,
          });
        }

        if (ruleResult.rows.length === 0) {
          warnings.push({
            code: 'model_chunk_fallback',
            message: `${chunk.label} needed model extraction after direct row parsing came up short.`,
            severity: 'info',
            chunkId: chunk.id,
            chunkLabel: chunk.label,
          });
        }

        previewRows.push(
          ...aiResult.transactions.map((transaction, transactionIndex) => ({
            id: createPreviewId(`${chunk.id}-ai-${subchunkIndex}`, transactionIndex),
            ...transaction,
            categoryId: null,
            suggestedCategoryId: null,
            categoryConfidence: null,
            parseMethod: 'apple-ai' as const,
            sourceChunkId: chunk.id,
            sourceLabel: chunk.label,
          }))
        );
      } catch (error) {
        warnings.push({
          code: 'chunk_failed',
          message:
            error instanceof Error
              ? `${chunk.label}: ${error.message}`
              : `${chunk.label} could not be parsed by the fallback model.`,
          severity: 'warning',
          chunkId: chunk.id,
          chunkLabel: chunk.label,
        });
      }
    }
  }

  const rowsWithSuggestions = await addCategorySuggestions(previewRows, categories);
  const uniqueRows = dedupePreviewRows(rowsWithSuggestions, warnings);

  return {
    rows: uniqueRows,
    warnings,
    methods: [...methods],
  };
}

function normalizeChunks(payload: ImportCapturePayload) {
  const chunks = payload.chunks
    .map((chunk) => ({
      ...chunk,
      text: chunk.text.trim(),
      label: chunk.label.trim() || defaultChunkLabel(chunk),
    }))
    .filter((chunk) => chunk.text.length > 0);

  if (chunks.length) {
    return chunks;
  }

  return payload.rawText.trim()
    ? [
        {
          id: 'capture-0',
          source: payload.source,
          label: payload.fileName?.trim() || 'Imported text',
          text: payload.rawText.trim(),
        },
      ]
    : [];
}

function defaultChunkLabel(chunk: ImportCaptureChunk) {
  if (chunk.pageNumber != null) {
    return `Page ${chunk.pageNumber}`;
  }

  switch (chunk.source) {
    case 'image':
      return 'Photo import';
    case 'scan':
      return 'Live scan';
    case 'pdf':
      return 'PDF import';
    default:
      return 'Imported text';
  }
}

function splitChunkForAI(chunk: ImportCaptureChunk) {
  if (chunk.text.length <= MAX_AI_CHUNK_CHARS) {
    return [chunk];
  }

  const lines = chunk.text.split(/\r?\n/);
  const subchunks: ImportCaptureChunk[] = [];
  let currentLines: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    const nextLength = currentLength + line.length + 1;
    if (currentLines.length > 0 && nextLength > MAX_AI_CHUNK_CHARS) {
      const text = currentLines.join('\n').trim();
      if (text) {
        subchunks.push({
          ...chunk,
          id: `${chunk.id}-part-${subchunks.length + 1}`,
          label: `${chunk.label} part ${subchunks.length + 1}`,
          text,
        });
      }
      currentLines = [line];
      currentLength = line.length + 1;
      continue;
    }

    currentLines.push(line);
    currentLength = nextLength;
  }

  const text = currentLines.join('\n').trim();
  if (text) {
    subchunks.push({
      ...chunk,
      id: `${chunk.id}-part-${subchunks.length + 1}`,
      label: `${chunk.label} part ${subchunks.length + 1}`,
      text,
    });
  }

  return subchunks.length ? subchunks : [chunk];
}

function parseStatementChunkRuleBased(chunk: ImportCaptureChunk) {
  const warnings: ImportWarning[] = [];
  const rows: ImportedTransactionDraft[] = [];
  const blocks = buildStatementBlocks(chunk.text);

  for (const block of blocks) {
    const parsed = parseStatementBlock(block);
    if (!parsed) continue;
    if (parsed.warning) {
      warnings.push({
        ...parsed.warning,
        chunkId: chunk.id,
        chunkLabel: chunk.label,
      });
      continue;
    }
    if (parsed.transaction) {
      rows.push(parsed.transaction);
    }
  }

  return { rows, warnings };
}

function buildStatementBlocks(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeStatementLine(line))
    .filter(Boolean)
    .filter((line) => !isIgnoredStatementLine(line));

  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (startsWithDate(line)) {
      if (current.length) {
        blocks.push(current);
      }
      current = [line];
      continue;
    }

    if (!current.length) continue;
    current.push(line);
  }

  if (current.length) {
    blocks.push(current);
  }

  return blocks;
}

function parseStatementBlock(
  lines: string[]
):
  | { transaction: ImportedTransactionDraft; warning?: never }
  | { transaction?: never; warning?: Omit<ImportWarning, 'chunkId' | 'chunkLabel'> }
  | null {
  const blockText = lines.join(' ');
  const date = extractStatementDate(blockText);
  if (!date) {
    return {
      warning: {
        code: 'row_skipped_invalid_date',
        message: `Skipped a row because the date could not be normalized: ${truncate(blockText)}`,
        severity: 'info',
      },
    };
  }

  const amountMatch = findTrailingAmount(blockText);
  if (!amountMatch) {
    return {
      warning: {
        code: 'row_skipped_invalid_amount',
        message: `Skipped a row because no transaction amount was found: ${truncate(blockText)}`,
        severity: 'info',
      },
    };
  }

  const description = cleanStatementDescription(blockText, amountMatch.raw);
  if (!description) {
    return {
      warning: {
        code: 'row_skipped_missing_description',
        message: `Skipped a row because the merchant name was missing: ${truncate(blockText)}`,
        severity: 'info',
      },
    };
  }

  return {
    transaction: {
      date,
      description,
      amount: amountMatch.amount,
      type: inferTransactionType(description, amountMatch.raw),
    },
  };
}

function normalizeStatementLine(line: string) {
  return line.replace(/\s+/g, ' ').trim();
}

function isIgnoredStatementLine(line: string) {
  const normalized = line.toLowerCase();
  return (
    normalized.length < 2 ||
    /(account activity|transaction description|merchant name|payments? and other credits|purchases|continued|page \d+|total|balance|starting balance|ending balance|date of transaction|description|debits?|credits?)/i.test(
      normalized
    )
  );
}

function startsWithDate(line: string) {
  return /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/.test(line);
}

function extractStatementDate(value: string) {
  const match = value.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (!match) return null;

  const month = Number.parseInt(match[1]!, 10);
  const day = Number.parseInt(match[2]!, 10);
  let year = match[3] ? Number.parseInt(match[3], 10) : new Date().getFullYear();
  if (year < 100) year += year >= 70 ? 1900 : 2000;

  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isValidDateParts(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function findTrailingAmount(value: string) {
  const matches = [...value.matchAll(/(?:\(?-?\$?\d[\d,]*\.?\d{0,2}\)?)/g)];
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const raw = matches[index]?.[0];
    if (!raw) continue;
    const amount = normalizeAmountString(raw);
    if (!amount) continue;
    return { raw, amount };
  }

  return null;
}

function normalizeAmountString(value: string) {
  const isNegative = value.includes('(') || value.trim().startsWith('-');
  const normalized = value.replace(/[$,\s()]/g, '').replace(/[^\d.-]/g, '');
  if (!normalized) return null;

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed === 0) {
    return null;
  }

  return Math.abs(isNegative ? -parsed : parsed).toFixed(2);
}

function cleanStatementDescription(value: string, rawAmount: string) {
  const withoutDates = value.replace(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/g, ' ');
  const withoutAmount = withoutDates.replace(rawAmount, ' ');
  return withoutAmount.replace(/\s+/g, ' ').trim();
}

function inferTransactionType(description: string, rawAmount: string) {
  if (rawAmount.includes('-') || rawAmount.includes('(')) {
    return 'expense' as const;
  }

  return /(payment|refund|deposit|interest|credit|salary|payroll|cashback)/i.test(description)
    ? ('income' as const)
    : ('expense' as const);
}

async function addCategorySuggestions(rows: ImportPreviewRow[], categories: Category[]) {
  if (!rows.length) return rows;

  const { indexCategoryDocs, suggestCategory } = await import('@/lib/ai/categorizer');
  await indexCategoryDocs(categories);

  return Promise.all(
    rows.map(async (row) => {
      if (row.type !== 'expense') {
        return row;
      }

      try {
        const suggestion = await suggestCategory({ description: row.description }, categories);
        return {
          ...row,
          categoryId: suggestion.categoryId ?? null,
          suggestedCategoryId: suggestion.categoryId ?? null,
          categoryConfidence: suggestion.categoryId ? suggestion.confidence : null,
        };
      } catch {
        return row;
      }
    })
  );
}

function dedupePreviewRows(rows: ImportPreviewRow[], warnings: ImportWarning[]) {
  const seen = new Set<string>();
  const unique: ImportPreviewRow[] = [];

  for (const row of rows) {
    const key = buildImportedDraftDedupKey(row);
    if (seen.has(key)) {
      warnings.push({
        code: 'duplicate_row',
        message: `Removed a duplicate imported row for ${row.description} on ${row.date}.`,
        severity: 'info',
        chunkId: row.sourceChunkId,
        chunkLabel: row.sourceLabel,
      });
      continue;
    }

    seen.add(key);
    unique.push(row);
  }

  return unique;
}

function createPreviewId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

function truncate(value: string, maxLength = 96) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}
