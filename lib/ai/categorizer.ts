import type { MemoryVectorStore } from 'react-native-rag';
import { localStorage } from '@/lib/local-storage';

export interface CategoryLite {
  id: number;
  name: string;
  icon: string;
  color: string;
  budget: string;
}

type Suggestion = {
  categoryId: number | null;
  confidence: number; // 0..1
  rationale?: string;
  candidates?: { id: number; score: number }[];
};

const RULE_PREFIX = 'rule_merchant_';

let vectorStore: MemoryVectorStore | null = null;
let indexedCategorySignatures = new Map<number, string>();
let indexedCategoryListSignature = '';

function hashKey(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return String(h >>> 0);
}

export function setVectorStore(store: MemoryVectorStore | null) {
  if (vectorStore !== store) {
    indexedCategorySignatures = new Map();
    indexedCategoryListSignature = '';
  }
  vectorStore = store;
}

export function normalizeMerchant(desc: string) {
  return desc
    .toLowerCase()
    .replace(/[#*_\-]/g, ' ')
    .replace(/\s+\d{2,}.*/, '') // drop trailing store numbers
    .replace(/,|\.|llc|inc|co\b|corp\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function indexCategoryDocs(categories: CategoryLite[]) {
  if (!vectorStore) return;

  const nextListSignature = buildCategoryListSignature(categories);
  if (nextListSignature === indexedCategoryListSignature) {
    return;
  }

  for (const cat of categories) {
    const signature = buildCategorySignature(cat);
    if (indexedCategorySignatures.get(cat.id) === signature) continue;
    const content = `Category: ${cat.name}. Budget monthly $${cat.budget}.`;
    try {
      await vectorStore.add(content.slice(0, 160), { type: 'category', id: String(cat.id) });
      indexedCategorySignatures.set(cat.id, signature);
    } catch {}
  }

  indexedCategoryListSignature = nextListSignature;
}

export async function recordFeedback(desc: string, categoryId: number, categoryName?: string) {
  try {
    await localStorage.init();
    const key = RULE_PREFIX + hashKey(normalizeMerchant(desc));
    const existing = (await localStorage.getSetting(key)) || null;
    const hits = (existing?.hits ?? 0) + 1;
    const confidence = Math.max(0.5, Math.min(0.95, 0.5 + Math.log10(1 + hits) / 2));
    await localStorage.setSetting(key, {
      merchant: normalizeMerchant(desc),
      categoryId,
      confidence,
      hits,
      updatedAt: new Date().toISOString(),
    });

    if (vectorStore && categoryName) {
      const content = `Tx: ${normalizeMerchant(desc)} -> Category: ${categoryName}`;
      try {
        await vectorStore.add(content.slice(0, 200), {
          type: 'exemplar',
          categoryId: String(categoryId),
        });
      } catch {}
    }
  } catch {}
}

export async function suggestCategory(
  tx: { description: string },
  categories: CategoryLite[]
): Promise<Suggestion> {
  const desc = tx.description || '';
  if (!desc.trim()) return { categoryId: null, confidence: 0 };

  try {
    await localStorage.init();
    const key = RULE_PREFIX + hashKey(normalizeMerchant(desc));
    const rule = await localStorage.getSetting(key);
    if (rule?.categoryId && rule?.confidence >= 0.7) {
      return { categoryId: rule.categoryId, confidence: rule.confidence, rationale: 'rule' };
    }
  } catch {}

  // Token match against category names as quick heuristic
  const lowDesc = normalizeMerchant(desc);
  let tokenHit: { id: number; score: number } | null = null;
  for (const cat of categories) {
    const name = cat.name.toLowerCase();
    if (lowDesc.includes(name)) {
      tokenHit = { id: cat.id, score: 0.5 };
      break;
    }
  }

  // Vector similarity if available
  if (vectorStore) {
    try {
      const results = await vectorStore.similaritySearch(lowDesc, 6);
      // Aggregate scores per category from exemplars + category docs
      const scores = new Map<number, number>();
      for (const r of results) {
        const meta = r.metadata || {};
        if (meta.type === 'exemplar' && meta.categoryId) {
          const id = Number(meta.categoryId);
          scores.set(id, (scores.get(id) || 0) + r.similarity * 1.0);
        } else if (meta.type === 'category' && meta.id) {
          const id = Number(meta.id);
          scores.set(id, (scores.get(id) || 0) + r.similarity * 0.6);
        }
      }
      if (tokenHit) scores.set(tokenHit.id, (scores.get(tokenHit.id) || 0) + tokenHit.score);
      if (scores.size > 0) {
        const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
        const [bestId, bestScore] = sorted[0]!;
        const second = sorted[1]?.[1] ?? 0;
        const margin = Math.max(0, bestScore - second);
        const confidence = Math.min(0.95, 0.55 + margin);
        return {
          categoryId: bestId,
          confidence,
          candidates: sorted.slice(0, 3).map(([id, score]) => ({ id, score })),
          rationale: 'vector',
        };
      }
    } catch {}
  }

  // fall back to heuristic if present
  if (tokenHit) return { categoryId: tokenHit.id, confidence: 0.5, rationale: 'token' };
  return { categoryId: null, confidence: 0 };
}

const categorizer = {
  setVectorStore,
  indexCategoryDocs,
  recordFeedback,
  suggestCategory,
  normalizeMerchant,
};

export default categorizer;

function buildCategorySignature(category: CategoryLite) {
  return `${category.id}|${category.name}|${category.budget}|${category.icon}|${category.color}`;
}

function buildCategoryListSignature(categories: CategoryLite[]) {
  return categories
    .map((category) => buildCategorySignature(category))
    .sort()
    .join('||');
}
