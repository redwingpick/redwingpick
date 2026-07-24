// Matches a free-text outfit description (color, pants, shirt, sleeve length)
// against each boot's outfit profile, using simple keyword overlap plus a
// few formality/shorts heuristics. No external API — pure text matching.

const DRESSY_PATTERN =
  /\b(button-down|button down|oxford shirt|sport coat|blazer|suit|dress shirt|slacks|trousers|quarter-zip|quarter zip|tie|dress pants|crisp shirt)\b/;
const CASUAL_PATTERN =
  /\b(flannel|tee|t-shirt|hoodie|sweatpants|joggers|henley|canvas jacket|jeans|denim)\b/;
const SHORTS_PATTERN = /\bshorts\b/;
const SHORT_SLEEVE_PATTERN = /\b(short[\s-]?sleeve|short sleeved)\b/;
const LONG_SLEEVE_PATTERN = /\b(long[\s-]?sleeve|long sleeved)\b/;

function seasonAllowed(boot, month) {
  return !boot.allowedMonths || boot.allowedMonths.includes(month);
}

// Keywords shared by most boots (e.g. "denim") barely tell pairs apart; rare,
// specific ones (e.g. "field jacket") do. Weight each keyword by how many
// boots in the pool actually carry it, so specificity beats generic overlap.
function buildKeywordWeights(pool) {
  const documentFrequency = new Map();
  for (const boot of pool) {
    for (const kw of boot.matchKeywords) {
      documentFrequency.set(kw, (documentFrequency.get(kw) || 0) + 1);
    }
  }
  const weights = new Map();
  for (const [kw, freq] of documentFrequency) {
    const phraseBonus = kw.includes(" ") ? 2 : 1;
    weights.set(kw, (phraseBonus * 3) / freq);
  }
  return weights;
}

export function matchOutfitToBoot(boots, month, rawText) {
  const text = rawText.trim().toLowerCase();
  if (!text) return null;

  const inSeason = boots.filter((b) => seasonAllowed(b, month));
  const pool = inSeason.length ? inSeason : boots;
  const keywordWeights = buildKeywordWeights(pool);

  const dressySignal = DRESSY_PATTERN.test(text);
  const casualSignal = CASUAL_PATTERN.test(text);
  const shortsSignal = SHORTS_PATTERN.test(text);
  const shortSleeveSignal = SHORT_SLEEVE_PATTERN.test(text);
  const longSleeveSignal = LONG_SLEEVE_PATTERN.test(text);

  const scored = pool.map((boot) => {
    let score = 0;
    const matched = [];

    for (const kw of boot.matchKeywords) {
      if (text.includes(kw)) {
        score += keywordWeights.get(kw);
        matched.push(kw);
      }
    }

    // Flat formality/shorts nudges stay small relative to specific keyword
    // matches above, so they only break near-ties rather than dominate.
    if (dressySignal && boot.tags.includes("dress")) score += 0.75;
    if (casualSignal && boot.tags.includes("casual")) score += 0.5;
    if (shortsSignal) {
      score += boot.tags.includes("shorts") ? 4 : boot.tags.includes("hot-ok") ? 1 : -3;
    }
    // Short sleeves read as warmer/more casual; long sleeves as cooler/dressier —
    // nudge toward boots already suited to those conditions.
    if (shortSleeveSignal && boot.tags.includes("hot-ok")) score += 0.5;
    if (longSleeveSignal && (boot.tags.includes("cold-ok") || boot.tags.includes("dress"))) {
      score += 0.5;
    }

    return { boot, score, matched };
  });

  scored.sort((a, b) => b.score - a.score || a.boot.rank - b.boot.rank);
  const best = scored[0];

  return {
    boot: best.boot,
    matchedTerms: best.matched,
    matchedAnything: best.score > 0,
  };
}
