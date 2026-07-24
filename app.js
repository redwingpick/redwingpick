import { BOOTS } from "./boots.js";
import { getPosition, reverseGeocode, getForecast } from "./weather.js";
import { pickForToday, buildNarrative } from "./picker.js";
import { matchOutfitToBoot } from "./outfitMatch.js";

const tempDisplay = document.getElementById("tempDisplay");
const cityDisplay = document.getElementById("cityDisplay");
const introParagraph = document.getElementById("introParagraph");
const choicesGrid = document.getElementById("choicesGrid");
const errorMessage = document.getElementById("errorMessage");
const outfitInput = document.getElementById("outfitInput");
const outfitSubmit = document.getElementById("outfitSubmit");
const customPickResult = document.getElementById("customPickResult");

const CHOICE_LABELS = ["Top Choice", "Second Choice", "Third Choice"];

// Falls back to the calendar month until a real forecast sets this.
let currentMonth = new Date().getMonth() + 1;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function buildChoiceRow(label, boot, narrativeText) {
  const row = document.createElement("div");
  row.className = "choice-row";

  const labelCol = document.createElement("div");
  labelCol.className = "choice-label";
  labelCol.textContent = label;

  const imageCol = document.createElement("div");
  imageCol.className = "choice-image-col";
  const img = document.createElement("img");
  img.src = `images/boots/${boot.id}.jpg`;
  img.alt = boot.name;
  img.onerror = () => {
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    placeholder.textContent = "Add a photo: images/boots/" + boot.id + ".jpg";
    img.replaceWith(placeholder);
  };
  const shoeName = document.createElement("div");
  shoeName.className = "shoe-name";
  shoeName.textContent = boot.name;
  const shoeModel = document.createElement("div");
  shoeModel.className = "shoe-model";
  shoeModel.textContent = `#${boot.model}`;
  imageCol.append(img, shoeName, shoeModel);

  const narrativeCol = document.createElement("div");
  narrativeCol.className = "narrative-col";
  narrativeCol.textContent = narrativeText;

  row.append(labelCol, imageCol, narrativeCol);
  return row;
}

function renderChoices(picks) {
  choicesGrid.innerHTML = "";
  picks.forEach((boot, i) => {
    choicesGrid.appendChild(buildChoiceRow(CHOICE_LABELS[i], boot, boot.outfit));
  });
}

// Calls the Netlify Function that proxies to Claude (Haiku) so the API key
// stays server-side. Throws on any failure — caller falls back to the local
// keyword matcher (e.g. running via plain http.server with no functions,
// network down, or the function/key isn't set up yet).
async function requestAIMatch(text, month) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("/api/match-outfit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ outfitText: text, month }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `Request failed: ${res.status}`);
    const boot = BOOTS.find((b) => b.id === data.bootId);
    if (!boot) throw new Error("Unknown bootId from AI: " + data.bootId);
    return { boot, reasoning: data.reasoning };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleOutfitSubmit() {
  const text = outfitInput.value;
  if (!text.trim()) return;

  outfitSubmit.disabled = true;
  outfitSubmit.textContent = "Thinking…";
  customPickResult.innerHTML = "";
  customPickResult.hidden = false;

  try {
    const { boot, reasoning } = await requestAIMatch(text, currentMonth);
    customPickResult.appendChild(buildChoiceRow("New Choice of the Day", boot, reasoning));
  } catch (err) {
    console.warn("AI match unavailable, falling back to keyword match:", err);
    const result = matchOutfitToBoot(BOOTS, currentMonth, text);
    const prefix = "(AI unavailable, matched by keyword instead) ";
    const narrative = result.matchedAnything
      ? `${prefix}Based on what you described (matched: ${result.matchedTerms.join(", ")}), this is the closest pair in the collection — ${result.boot.signature.toLowerCase()}.`
      : `${prefix}Couldn't find a strong match in "${text.trim()}", so here's the closest overall pick by ranking: ${result.boot.signature.toLowerCase()}.`;
    customPickResult.appendChild(buildChoiceRow("New Choice of the Day", result.boot, narrative));
  } finally {
    outfitSubmit.disabled = false;
    outfitSubmit.textContent = "Find my boot";
  }
}

outfitSubmit.addEventListener("click", handleOutfitSubmit);
outfitInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleOutfitSubmit();
  }
});

async function init() {
  try {
    const { lat, lon } = await getPosition();
    const [city, weather] = await Promise.all([
      reverseGeocode(lat, lon),
      getForecast(lat, lon),
    ]);

    tempDisplay.innerHTML = `${weather.tempF}°<span class="hi-lo">H:${weather.highF}° L:${weather.lowF}°</span>`;
    cityDisplay.textContent = city;
    currentMonth = weather.month;

    const picks = pickForToday(BOOTS, weather);
    introParagraph.textContent = buildNarrative(weather, city, picks);
    renderChoices(picks);
  } catch (err) {
    console.error(err);
    tempDisplay.textContent = "--°";
    cityDisplay.textContent = "Location unavailable";
    introParagraph.textContent =
      "Couldn't get your location and weather, so here's today's picks based on ranking alone.";
    if (err && err.code === 1) {
      showError(
        "Location access was denied. Allow location permission for this site and reload to get weather-based picks."
      );
    } else {
      showError("Something went wrong fetching weather: " + (err.message || err));
    }
    // Fallback: mild-weather default so the page still shows something useful
    const fallbackWeather = {
      tempF: 60,
      feelsLikeF: 60,
      highF: 65,
      lowF: 55,
      precipitationIn: 0,
      rainIn: 0,
      snowIn: 0,
      precipChancePct: 0,
      windMph: 5,
      humidity: 50,
      weatherCode: 1,
      conditionText: "unknown conditions",
      month: new Date().getMonth() + 1,
    };
    const picks = pickForToday(BOOTS, fallbackWeather);
    renderChoices(picks);
  }
}

init();
