import type { ImportedTransactionDraft } from '@/lib/appleFinanceImport';

export interface StatementImportParseResult {
  transactions: ImportedTransactionDraft[];
  warnings: string[];
  method: 'csv' | 'ai';
}

const DATE_HEADER_CANDIDATES = [
  'date',
  'transaction date',
  'posted date',
  'posting date',
  'post date',
];

const DESCRIPTION_HEADER_CANDIDATES = ['description', 'details', 'merchant', 'name', 'transaction'];

const AMOUNT_HEADER_CANDIDATES = ['amount', 'transaction amount', 'value', 'total'];
const DEBIT_HEADER_CANDIDATES = ['debit', 'withdrawal', 'charge', 'spent'];
const CREDIT_HEADER_CANDIDATES = ['credit', 'deposit', 'payment', 'received'];

export function looksLikeCsv(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const firstLines = trimmed.split(/\r?\n/).slice(0, 4).filter(Boolean);

  if (!firstLines.length) return false;
  return firstLines.some((line) => [',', ';', '\t'].some((delimiter) => line.includes(delimiter)));
}

export function parseCsvTransactionDrafts(raw: string): StatementImportParseResult {
  const lines = raw
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      transactions: [],
      warnings: ['Add a header row and at least one transaction row.'],
      method: 'csv',
    };
  }

  const delimiter = detectDelimiter(lines.slice(0, 4));
  const headerCells = splitDelimitedLine(lines[0]!, delimiter).map(normalizeHeader);
  const fieldMap = {
    date: findHeaderIndex(headerCells, DATE_HEADER_CANDIDATES),
    description: findHeaderIndex(headerCells, DESCRIPTION_HEADER_CANDIDATES),
    amount: findHeaderIndex(headerCells, AMOUNT_HEADER_CANDIDATES),
    debit: findHeaderIndex(headerCells, DEBIT_HEADER_CANDIDATES),
    credit: findHeaderIndex(headerCells, CREDIT_HEADER_CANDIDATES),
  };

  const warnings: string[] = [];
  if (fieldMap.date < 0)
    warnings.push('No date column found. Expected a Date or Posted Date header.');
  if (fieldMap.description < 0) warnings.push('No description column found.');
  if (fieldMap.amount < 0 && fieldMap.debit < 0 && fieldMap.credit < 0) {
    warnings.push('No amount, debit, or credit column found.');
  }

  if (warnings.length) {
    return { transactions: [], warnings, method: 'csv' };
  }

  const transactions: ImportedTransactionDraft[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitDelimitedLine(line, delimiter);
    const description = cleanDescription(cells[fieldMap.description] ?? '');
    const date = normalizeImportedDate(cells[fieldMap.date] ?? '');
    if (!description || !date) continue;

    const debitAmount = parseCurrencyValue(cells[fieldMap.debit] ?? '');
    const creditAmount = parseCurrencyValue(cells[fieldMap.credit] ?? '');
    const rawAmount = parseCurrencyValue(cells[fieldMap.amount] ?? '');

    const resolved = resolveAmountAndType({
      description,
      amount: rawAmount,
      debitAmount,
      creditAmount,
    });

    if (!resolved) continue;

    transactions.push({
      description,
      amount: resolved.amount,
      type: resolved.type,
      date,
    });
  }

  if (!transactions.length && warnings.length === 0) {
    warnings.push('No transaction rows could be parsed from that CSV.');
  }

  return { transactions, warnings, method: 'csv' };
}

function detectDelimiter(lines: string[]) {
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestScore = -1;

  for (const delimiter of candidates) {
    const score = lines.reduce((sum, line) => sum + splitDelimitedLine(line, delimiter).length, 0);
    if (score > bestScore) {
      best = delimiter;
      bestScore = score;
    }
  }

  return best;
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findHeaderIndex(headers: string[], candidates: string[]) {
  let bestIndex = -1;
  let bestScore = 0;

  headers.forEach((header, index) => {
    const score = scoreHeaderMatch(header, candidates);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function scoreHeaderMatch(header: string, candidates: string[]) {
  const headerTokens = new Set(header.split(' ').filter(Boolean));
  let bestScore = 0;

  for (const candidate of candidates) {
    if (header === candidate) {
      return 100;
    }

    const candidateTokens = candidate.split(' ').filter(Boolean);
    const allTokensMatch = candidateTokens.every((token) => headerTokens.has(token));
    if (!allTokensMatch) {
      continue;
    }

    let score = candidateTokens.length * 10;
    if (header.startsWith(candidate)) score += 4;
    if (header.endsWith(candidate)) score += 2;
    if (header.includes(candidate)) score += 2;

    const extraTokenCount = headerTokens.size - candidateTokens.length;
    score -= Math.min(extraTokenCount, 4);

    bestScore = Math.max(bestScore, score);
  }

  return bestScore;
}

function cleanDescription(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function parseCurrencyValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isNegative = trimmed.includes('(') || trimmed.startsWith('-');
  const normalized = trimmed.replace(/[$,\s()]/g, '').replace(/[^\d.-]/g, '');
  if (!normalized) return null;

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed === 0) return null;

  return isNegative ? -Math.abs(parsed) : parsed;
}

function resolveAmountAndType(params: {
  description: string;
  amount: number | null;
  debitAmount: number | null;
  creditAmount: number | null;
}): { amount: string; type: 'income' | 'expense' } | null {
  if (params.debitAmount != null && Math.abs(params.debitAmount) > 0) {
    return {
      amount: toAmountString(Math.abs(params.debitAmount)),
      type: 'expense',
    };
  }

  if (params.creditAmount != null && Math.abs(params.creditAmount) > 0) {
    return {
      amount: toAmountString(Math.abs(params.creditAmount)),
      type: 'income',
    };
  }

  if (params.amount == null) return null;

  if (params.amount < 0) {
    return {
      amount: toAmountString(Math.abs(params.amount)),
      type: 'expense',
    };
  }

  const lowerDescription = params.description.toLowerCase();
  const incomeLike = /(payment|refund|deposit|interest|credit|salary|payroll)/i.test(
    lowerDescription
  );

  return {
    amount: toAmountString(Math.abs(params.amount)),
    type: incomeLike ? 'income' : 'expense',
  };
}

function normalizeImportedDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]!.padStart(2, '0')}-${isoMatch[3]!.padStart(2, '0')}`;
  }

  const slashMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(trimmed);
  if (slashMatch) {
    let first = Number.parseInt(slashMatch[1]!, 10);
    let second = Number.parseInt(slashMatch[2]!, 10);
    let year = Number.parseInt(slashMatch[3]!, 10);

    if (year < 100) year += year >= 70 ? 1900 : 2000;

    let month = first;
    let day = second;
    if (first > 12 && second <= 12) {
      month = second;
      day = first;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toAmountString(value: number) {
  return value.toFixed(2);
}
