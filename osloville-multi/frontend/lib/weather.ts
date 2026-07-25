// Real Oslo weather via open-meteo (no key)
export type OsloWeather = { temp: number; wind: number; isSnow: boolean; isRain: boolean; desc: string };

let cache: OsloWeather | null = null;
let lastFetch = 0;

export async function fetchOsloWeather(): Promise<OsloWeather> {
  const now = Date.now();
  if (cache && now - lastFetch < 1000 * 60 * 10) return cache; // 10min cache
  try {
    // Oslo 59.91,10.75
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=59.91&longitude=10.75&current=temperature_2m,precipitation,wind_speed_10m,weather_code&timezone=Europe%2FBerlin';
    const res = await fetch(url);
    const j = await res.json();
    const temp = j.current?.temperature_2m ?? -2;
    const wind = j.current?.wind_speed_10m ?? 5;
    const code = j.current?.weather_code ?? 1;
    const isSnow = temp <= 0 || [71,73,75,77,85,86].includes(code);
    const isRain = [61,63,65,80,81,82,95].includes(code);
    const desc = temp < -5 ? 'Freezing & clear ❄️' : isSnow ? 'Snowing ❄️' : isRain ? 'Rainy 🌧️' : temp > 15 ? 'Sunny summer ☀️' : 'Golden hour ☀️';
    cache = { temp, wind, isSnow, isRain, desc };
    lastFetch = now;
    return cache;
  } catch {
    return { temp: -2, wind: 8, isSnow: true, isRain: false, desc: 'Golden hour ☀️' };
  }
}
