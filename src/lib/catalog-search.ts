/**
 * Shop search (Phase 8 D5). Pure and in memory over the cached catalogue: every query word must
 * match a word in the product (a partly typed word may match the start of one); name matches
 * rank first.
 */

const ACCENTS = new RegExp("[\\u0300-\\u036f]", "g");
const SPLIT = new RegExp("[^a-z0-9\\u4e00-\\u9fff]+");

const raw = (text: string) =>
  text.normalize("NFKD").replace(ACCENTS, "").toLowerCase().split(SPLIT).filter(Boolean);

function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/** Lowercase words without accents or punctuation; a plural "s" is dropped ("cats" → "cat"). */
export function words(text: string): string[] {
  return raw(text).map(stem);
}

export type SearchDoc = {
  id: string;
  /** Product name: strongest. */
  name: string;
  /** Design names, category names, tag names, SKUs. */
  related: string[];
  description: string;
};

const WEIGHTS = { name: 4, related: 2, description: 1 } as const;
export const MAX_QUERY = 100;

type Term = { word: string; whole: boolean };

/**
 * Query words, capped (a pasted paragraph shouldn't do 200 passes). A plural is a finished
 * word, so it must match a whole word ("cats" isn't "caterpillar"); anything else may be the
 * start of one ("succ" → "succulent").
 */
export function queryWords(q: string): Term[] {
  const seen = new Map<string, Term>();
  for (const w of raw(q.slice(0, MAX_QUERY))) {
    const word = stem(w);
    const prev = seen.get(word);
    seen.set(word, { word, whole: word !== w && (prev?.whole ?? true) });
  }
  return [...seen.values()].slice(0, 8);
}

/** Ids of the matching docs, best first. Ties keep the input order. */
export function search(docs: readonly SearchDoc[], q: string): string[] {
  const terms = queryWords(q);
  if (terms.length === 0) return [];
  const scored: { id: string; score: number; i: number }[] = [];
  docs.forEach((d, i) => {
    const fields = {
      name: words(d.name),
      related: d.related.flatMap(words),
      description: words(d.description),
    };
    let score = 0;
    for (const { word, whole } of terms) {
      let best = 0;
      for (const key of ["name", "related", "description"] as const) {
        const hit = fields[key].find((w) => (whole ? w === word : w.startsWith(word)));
        if (hit) best = Math.max(best, WEIGHTS[key] * (hit === word ? 1.5 : 1));
      }
      if (best === 0) return; // every word must match
      score += best;
    }
    scored.push({ id: d.id, score, i });
  });
  return scored.sort((a, b) => b.score - a.score || a.i - b.i).map((s) => s.id);
}
