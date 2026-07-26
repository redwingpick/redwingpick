// Netlify Function (v2, .mjs) — proxies outfit-matching requests to the
// Claude API so the Anthropic API key stays server-side, never in the
// browser. Set ANTHROPIC_API_KEY as an environment variable in the Netlify
// site dashboard (Site configuration -> Environment variables) — never in code.
import { BOOTS } from "../../boots.js";
import { WARDROBE } from "../../wardrobe.js";
import { NON_RED_WING_FOOTWEAR } from "../../nonRedWingFootwear.js";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_OUTFIT_LENGTH = 500;
const REALLY_REALLY_HOT_F = 80; // only this hot does a non-Red-Wing suggestion even enter the catalog

function seasonAllowed(boot, month) {
  return !boot.allowedMonths || boot.allowedMonths.includes(month);
}

function buildCatalog(month, highF) {
  const catalog = BOOTS.map((b) => ({
    id: b.id,
    name: b.name,
    leather: b.leather,
    signature: b.signature,
    tags: b.tags,
    isRedWing: true,
    inSeasonRightNow: seasonAllowed(b, month),
  }));

  if (typeof highF === "number" && highF >= REALLY_REALLY_HOT_F) {
    catalog.push(
      ...NON_RED_WING_FOOTWEAR.map((item) => ({
        id: item.id,
        name: item.name,
        leather: item.leather,
        signature: item.signature,
        tags: item.tags,
        isRedWing: false,
        inSeasonRightNow: seasonAllowed(item, month),
      }))
    );
  }

  return catalog;
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server is missing ANTHROPIC_API_KEY" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const outfitText = (body.outfitText || "").toString().trim().slice(0, MAX_OUTFIT_LENGTH);
  const month = Number(body.month) || new Date().getMonth() + 1;
  const highF = typeof body.highF === "number" ? body.highF : undefined;

  if (!outfitText) {
    return new Response(JSON.stringify({ error: "outfitText is required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const catalog = buildCatalog(month, highF);
  const nonRedWingEligible = typeof highF === "number" && highF >= REALLY_REALLY_HOT_F;

  const nonRedWingInstruction = nonRedWingEligible
    ? `\n\nToday's high is ${highF}°F. The catalog includes non-Red-Wing items (isRedWing:false: Birkenstock Kyoto sandals, adidas VL Court 3.0 sneakers, adidas Daily 3.0 sneakers) as options. Don't reach for these just because it's hot — only pick one when the outfit specifically calls for it, per these two style rules:

1. If the outfit reads athletic/athleisure (athletic shorts, performance fabric, sporty or gym vibe) paired with shorts, strongly prefer the adidas sneakers or the Birkenstock Kyoto over any Red Wing boot.
2. If the outfit is trendier/smart-casual (e.g. a button-down or collared shirt) and NOT black, paired with shorts, prefer one of the two shorts-compatible Red Wings (8079 Shop Moc Oxford or 3604 Weekender) — unless today's high is over 80°F, in which case the Birkenstock Kyoto is the better call instead.

For any other shorts outfit that doesn't clearly match either style, use your judgment between the shorts-compatible Red Wings and the non-Red-Wing options.`
    : "";

  const prompt = `You are picking the single best-matching boot from Kirk's Red Wing collection for a described outfit.

Outfit described: "${outfitText}"

Boot catalog (JSON):
${JSON.stringify(catalog, null, 2)}

Kirk's wardrobe outside of Red Wing boots (JSON) — the outfit description may name specific pieces from this list by brand/model. Use it to infer color, fabric, and formality when a named piece isn't self-explanatory (e.g. knowing "Hammer Made Banff" is a shirt, or that a jacket is waxed canvas vs. quilted):
${JSON.stringify(WARDROBE, null, 2)}

Consider color, type of pants, sleeve length, and type of shirt mentioned in the outfit. When the outfit is built around black clothing, lean toward black or grey boots (leather field mentions "Black" or "Grey") — only pick a brown/tan/copper boot in that case if it genuinely works better than the black/grey options, and say why. Prefer boots where "inSeasonRightNow" is true unless nothing else fits meaningfully better. Pick exactly one item by its "id" and explain your choice in 1-2 sentences referencing the specific outfit details that drove it — naming the actual wardrobe piece if one was mentioned.${nonRedWingInstruction}`;

  let anthropicRes;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
        tools: [
          {
            name: "pick_boot",
            description: "Selects the single best-matching item (boot, or occasionally non-Red-Wing footwear) for the described outfit.",
            input_schema: {
              type: "object",
              properties: {
                bootId: {
                  type: "string",
                  description: "The id field of the chosen item from the provided catalog",
                },
                reasoning: {
                  type: "string",
                  description: "1-2 sentence explanation referencing specific outfit details",
                },
              },
              required: ["bootId", "reasoning"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "pick_boot" },
      }),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to reach Anthropic API: " + err.message }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text();
    return new Response(JSON.stringify({ error: "Anthropic API error: " + detail }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const data = await anthropicRes.json();
  const toolUse = data.content?.find((block) => block.type === "tool_use" && block.name === "pick_boot");

  if (!toolUse) {
    return new Response(JSON.stringify({ error: "Model did not return a boot pick" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const { bootId, reasoning } = toolUse.input;
  const matchedItem = [...BOOTS, ...NON_RED_WING_FOOTWEAR].find((b) => b.id === bootId);

  if (!matchedItem) {
    return new Response(JSON.stringify({ error: "Model returned an unknown boot id: " + bootId }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ bootId, reasoning }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

export const config = {
  path: "/api/match-outfit",
};
