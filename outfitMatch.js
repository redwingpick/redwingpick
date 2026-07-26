// Matches a free-text outfit description (color, pants, shirt, sleeve length)
// against each boot's outfit profile, using simple keyword overlap plus a
// few formality/shorts heuristics. No external API — pure text matching.

import { NON_RED_WING_FOOTWEAR } from "./nonRedWingFootwear.js";

const REALLY_REALLY_HOT_F = 80; // only this hot does a non-Red-Wing suggestion even enter the pool
const BIRKENSTOCK_SHORTS_THRESHOLD_F = 80; // above this, smart-casual shorts outfits lean Birkenstock

const DRESSY_PATTERN =
  /\b(button-down|button down|oxford shirt|sport coat|blazer|suit|dress shirt|slacks|trousers|quarter-zip|quarter zip|tie|dress pants|crisp shirt)\b/;
const CASUAL_PATTERN =
  /\b(flannel|tee|t-shirt|hoodie|sweatpants|joggers|henley|canvas jacket|jeans|denim)\b/;
const SHORTS_PATTERN = /\bshorts\b/;
const BLACK_OUTFIT_PATTERN = /\bblack\b/;
const ATHLETIC_PATTERN = /\b(athletic|athleisure|sporty|performance|gym|track jacket|running)\b/;
const SHORT_SLEEVE_PATTERN = /\b(short[\s-]?sleeve|short sleeved)\b/;
const LONG_SLEEVE_PATTERN = /\b(long[\s-]?sleeve|long sleeved)\b/;

const SHORTS_FRIENDLY_RW_IDS = ["8079-abilene-moc", "3604-weekender"];
const ADIDAS_IDS = ["adidas-vl-court", "adidas-daily-3-blue"];

function seasonAllowed(boot, month) {
  return !boot.allowedMonths || boot.allowedMonths.includes(month);
}

function isBlackOrGreyLeather(boot) {
  const leather = boot.leather.toLowerCase();
  return leather.includes("black") || leather.includes("grey") || leather.includes("gray");
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

export function matchOutfitToBoot(boots, month, rawText, weather) {
  const text = rawText.trim().toLowerCase();
  if (!text) return null;

  const inSeason = boots.filter((b) => seasonAllowed(b, month));
  const basePool = inSeason.length ? inSeason : boots;
  // Only on really, really hot days does a non-Red-Wing option even become
  // eligible — and even then only wins if the outfit's keywords favor it.
  const reallyReallyHot = weather && weather.highF >= REALLY_REALLY_HOT_F;
  const pool = reallyReallyHot ? [...basePool, ...NON_RED_WING_FOOTWEAR] : basePool;
  const keywordWeights = buildKeywordWeights(pool);

  const dressySignal = DRESSY_PATTERN.test(text);
  const casualSignal = CASUAL_PATTERN.test(text);
  const shortsSignal = SHORTS_PATTERN.test(text);
  const blackOutfitSignal = BLACK_OUTFIT_PATTERN.test(text);
  const athleticSignal = ATHLETIC_PATTERN.test(text);
  const shortSleeveSignal = SHORT_SLEEVE_PATTERN.test(text);
  const longSleeveSignal = LONG_SLEEVE_PATTERN.test(text);
  const smartCasualShorts = shortsSignal && !athleticSignal && dressySignal && !blackOutfitSignal;
  const birkenstockWeather = weather && weather.highF > BIRKENSTOCK_SHORTS_THRESHOLD_F;

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
    // Wearing black leans toward black/grey boots. Brown isn't ruled out —
    // it just needs strong specific keyword matches to overcome the nudge.
    if (blackOutfitSignal) {
      score += isBlackOrGreyLeather(boot) ? 3 : -2;
    }
    // Short sleeves read as warmer/more casual; long sleeves as cooler/dressier —
    // nudge toward boots already suited to those conditions.
    if (shortSleeveSignal && boot.tags.includes("hot-ok")) score += 0.5;
    if (longSleeveSignal && (boot.tags.includes("cold-ok") || boot.tags.includes("dress"))) {
      score += 0.5;
    }
    // Athletic/athleisure shorts outfits strongly favor adidas or Birkenstock
    // over any Red Wing, including the shorts-compatible ones.
    if (shortsSignal && athleticSignal && (ADIDAS_IDS.includes(boot.id) || boot.id === "birkenstock-kyoto")) {
      score += 6;
    }
    // Trendier, non-black shorts outfit (e.g. a button-down): the two
    // shorts-friendly Red Wings are the default call, but Birkenstock takes
    // over once it's genuinely hot (>80°F).
    if (smartCasualShorts) {
      if (SHORTS_FRIENDLY_RW_IDS.includes(boot.id)) score += 5;
      if (birkenstockWeather && boot.id === "birkenstock-kyoto") score += 7;
    }

    return { boot, score, matched };
  });

  scored.sort((a, b) => b.score - a.score || (a.boot.rank ?? 99) - (b.boot.rank ?? 99));
  const best = scored[0];

  return {
    boot: best.boot,
    matchedTerms: best.matched,
    matchedAnything: best.score > 0,
  };
}
