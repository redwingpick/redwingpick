// Picks today's top 3 boots from the collection based on weather + season fit,
// weighted by Kirk's ranking, with a date-seeded jitter so the #1 pick
// doesn't lock to the same boot every single day when several are equally suitable.

import { NON_RED_WING_FOOTWEAR } from "./nonRedWingFootwear.js";

function hashToUnit(str) {
  // djb2 hash, normalized to [0, 1)
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const HOT_DAY_THRESHOLD_F = 80; // "very warm/sunny" — shorts-weather territory
const REALLY_HOT_THIRD_CHOICE_F = 85; // above this, Third Choice can go non-Red-Wing
const HEAVY_RAIN_OVERRIDE_PCT = 80; // above this chance of rain, don't force shorts-only mode
const HEAVY_RAIN_OVERRIDE_IN = 0.3; // or a substantial daily rain total (proxy for all-day rain)

function isWetDay(weather) {
  return (
    weather.rainIn > 0.02 ||
    weather.precipitationIn > 0.02 ||
    weather.precipChancePct >= 50
  );
}

function isSnowyDay(weather) {
  return weather.snowIn > 0.01;
}

function tempFitScore(boot, dayLowF, dayHighF) {
  const [idealLow, idealHigh] = boot.idealTempF;
  const overlap = Math.min(idealHigh, dayHighF) - Math.max(idealLow, dayLowF);
  if (overlap >= 0) return 100;
  const gap = -overlap; // how far apart the two ranges are
  return Math.max(0, 100 - gap * 4);
}

function precipScore(boot, weather) {
  const isWet = isWetDay(weather);
  const isSnowing = isSnowyDay(weather);
  const tags = boot.tags;

  if (isSnowing) {
    if (tags.includes("snow-ok")) return 100;
    if (tags.includes("wet-ok")) return 55;
    return 10;
  }
  if (isWet) {
    if (tags.includes("wet-ok") || tags.includes("snow-ok")) return 100;
    if (tags.includes("dry-only")) return 15;
    return 50;
  }
  // Dry day
  if (tags.includes("dry-only")) return 100;
  return 90;
}

function extremeTempScore(boot, dayLowF, dayHighF) {
  const tags = boot.tags;
  // Judge against whichever extreme the boot will actually face that day.
  if (dayHighF >= 78) {
    if (tags.includes("hot-ok")) return 100;
    if (tags.includes("cold-ok")) return 20;
    return 60;
  }
  if (dayLowF <= 25) {
    if (tags.includes("cold-ok")) return 100;
    if (tags.includes("hot-ok")) return 15;
    return 55;
  }
  return 75; // mild — no strong signal either way
}

function seasonAllowed(boot, month) {
  return !boot.allowedMonths || boot.allowedMonths.includes(month);
}

export function pickForToday(boots, weather, options = {}) {
  const { excludeFromTop } = options;
  const dateKey = todayKey();
  const month = weather.month;
  const wet = isWetDay(weather);
  const snowy = isSnowyDay(weather);
  const heavyRainOverride =
    weather.precipChancePct > HEAVY_RAIN_OVERRIDE_PCT || weather.rainIn > HEAVY_RAIN_OVERRIDE_IN;
  const veryHot = weather.highF >= HOT_DAY_THRESHOLD_F && !heavyRainOverride;

  let pool;
  if (veryHot) {
    // Very warm/sunny days mean shorts weather — only genuine hot-weather
    // pairs are in rotation, full stop, regardless of rank or season. Skipped
    // entirely when heavy rain is expected, even on a hot day.
    pool = boots.filter((b) => b.tags.includes("hot-ok"));
  } else {
    const inSeason = boots.filter((b) => seasonAllowed(b, month));
    pool = inSeason.length >= 3 ? inSeason : boots;

    if (wet || snowy) {
      // Oxfords and other low-cut, dry-only pairs are totally out in the wet/snow.
      const weatherSafe = pool.filter((b) => !b.tags.includes("dry-only"));
      if (weatherSafe.length >= 3) pool = weatherSafe;
    }
  }

  const scored = pool.map((boot) => {
    const rankWeight = (15 - boot.rank) * 1.5; // favor higher-ranked boots
    const seasonPenalty = seasonAllowed(boot, month) ? 0 : -35;
    const statementPenalty = boot.tags.includes("statement") ? -10 : 0;
    const jitter = (hashToUnit(dateKey + boot.id) - 0.5) * 16; // +/-8, rotates daily

    const base =
      tempFitScore(boot, weather.lowF, weather.highF) * 0.4 +
      precipScore(boot, weather) * 0.35 +
      extremeTempScore(boot, weather.lowF, weather.highF) * 0.25;

    const total = base + rankWeight + seasonPenalty + statementPenalty + jitter;

    return { boot, score: total };
  });

  scored.sort((a, b) => b.score - a.score);

  // Never repeat yesterday's #1 pick as today's #1 — demote it to #2 instead
  // of dropping it, so the group of 3 stays otherwise unchanged.
  if (excludeFromTop && scored[0]?.boot.id === excludeFromTop && scored.length > 1) {
    [scored[0], scored[1]] = [scored[1], scored[0]];
  }

  const top3 = scored.slice(0, 3).map((s) => s.boot);

  // On really hot days, Third Choice is up for grabs between the two
  // shorts-compatible boots and two non-Red-Wing warm-weather options —
  // "are you sure you want Red Wings today?" — but boots can still win.
  if (weather.highF >= REALLY_HOT_THIRD_CHOICE_F && !heavyRainOverride) {
    const alreadyChosenIds = new Set([top3[0].id, top3[1].id]);
    const shortsBoots = boots.filter(
      (b) => b.tags.includes("shorts") && !alreadyChosenIds.has(b.id)
    );
    const altCandidates = [...NON_RED_WING_FOOTWEAR, ...shortsBoots].filter(
      (item) => !alreadyChosenIds.has(item.id)
    );

    if (altCandidates.length > 0) {
      const altScored = altCandidates.map((item) => {
        const rankWeight = item.isRedWing === false ? 6 : (15 - item.rank) * 1.5;
        const jitter = (hashToUnit(dateKey + item.id + "-third-choice") - 0.5) * 16;
        const base =
          tempFitScore(item, weather.lowF, weather.highF) * 0.4 +
          precipScore(item, weather) * 0.35 +
          extremeTempScore(item, weather.lowF, weather.highF) * 0.25;
        return { item, score: base + rankWeight + jitter };
      });
      altScored.sort((a, b) => b.score - a.score);
      top3[2] = altScored[0].item;
    }
  }

  return top3;
}

export function buildNarrative(weather, city, picks) {
  const [top] = picks;
  const avgF = (weather.lowF + weather.highF) / 2;
  const tempDesc =
    avgF >= 80
      ? "hot"
      : avgF >= 65
      ? "warm"
      : avgF >= 45
      ? "mild"
      : avgF >= 30
      ? "cold"
      : "brutally cold";

  const isSnowing = isSnowyDay(weather);
  const isWet = isWetDay(weather);
  const heavyRainOverride =
    weather.precipChancePct > HEAVY_RAIN_OVERRIDE_PCT || weather.rainIn > HEAVY_RAIN_OVERRIDE_IN;
  const veryHot = weather.highF >= HOT_DAY_THRESHOLD_F && !heavyRainOverride;

  const wetNote = isSnowing
    ? " with snow likely"
    : isWet
    ? ` with a ${weather.precipChancePct}% chance of rain`
    : "";

  // This order must mirror pickForToday's actual precedence (veryHot is
  // decided before any wet/snow exclusion is even considered there), or the
  // narrative can claim something the picks contradict — e.g. saying
  // "oxfords are off the table" while the hot-day pool is 100% oxfords.
  const reasonBits = [];
  if (isSnowing && !veryHot) reasonBits.push("something that can handle snow underfoot — oxfords are off the table entirely");
  else if (veryHot) reasonBits.push("something built for genuine shorts-weather heat, which narrows things down fast");
  else if (isWet) reasonBits.push("a boot that won't flinch at wet pavement — oxfords are off the table entirely");
  else if (weather.highF >= 78) reasonBits.push("something breathable enough for genuine heat");
  else if (weather.lowF <= 25) reasonBits.push("real cold-weather protection");
  else reasonBits.push("whatever's most versatile for a day like this");

  const secondThirdMention =
    picks[2].isRedWing === false
      ? `backed up by the ${picks[1].name} as a strong alternate — though honestly, on a day this hot, the ${picks[2].name} might be the smarter move over another boot`
      : `backed up by the ${picks[1].name} and the ${picks[2].name} as strong alternates from the collection`;

  return `Today in ${city} is calling for a high of ${weather.highF}°F and a low of ${weather.lowF}°F, ${weather.conditionText}${wetNote} (right now it's ${weather.tempF}°F, feels like ${weather.feelsLikeF}°F). That range points toward ${reasonBits[0]}, which is why the ${top.name} takes the top spot today, ${secondThirdMention}.`;
}
