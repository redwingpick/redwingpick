// Geolocation + weather, no API keys required.
// Forecast: Open-Meteo (https://open-meteo.com)
// Reverse geocode (coords -> city name): BigDataCloud client-side endpoint

const WMO_DESCRIPTIONS = {
  0: "clear sky",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "foggy with rime",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  56: "freezing drizzle",
  57: "freezing drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  66: "freezing rain",
  67: "freezing rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "light rain showers",
  81: "rain showers",
  82: "heavy rain showers",
  85: "snow showers",
  86: "heavy snow showers",
  95: "thunderstorms",
  96: "thunderstorms with hail",
  99: "severe thunderstorms with hail",
};

export function describeWeatherCode(code) {
  return WMO_DESCRIPTIONS[code] || "unusual conditions";
}

export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

export async function reverseGeocode(lat, lon) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Reverse geocoding failed");
  const data = await res.json();
  const city =
    data.city || data.locality || data.principalSubdivision || "Unknown location";
  return city;
}

export async function getForecast(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current:
      "temperature_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,wind_speed_10m,relative_humidity_2m",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,snowfall_sum,precipitation_probability_max,weather_code",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
    forecast_days: 1,
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather lookup failed");
  const data = await res.json();
  const c = data.current;
  const d = data.daily;

  return {
    // Current, instantaneous reading — used for the "right now" corner display.
    tempF: Math.round(c.temperature_2m),
    feelsLikeF: Math.round(c.apparent_temperature),
    windMph: Math.round(c.wind_speed_10m),
    humidity: c.relative_humidity_2m,

    // Whole-day forecast — used to pick boots and write the narrative.
    highF: Math.round(d.temperature_2m_max[0]),
    lowF: Math.round(d.temperature_2m_min[0]),
    precipitationIn: d.precipitation_sum[0],
    rainIn: d.rain_sum[0],
    snowIn: d.snowfall_sum[0],
    precipChancePct: d.precipitation_probability_max[0],
    weatherCode: d.weather_code[0],
    conditionText: describeWeatherCode(d.weather_code[0]),
    month: new Date(c.time).getMonth() + 1,
  };
}
