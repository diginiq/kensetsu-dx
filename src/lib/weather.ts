export interface DayForecast {
  date: string      // YYYY-MM-DD
  weatherCode: number
  tempMax: number
  tempMin: number
  precipProb: number // 0-100
}

export interface WeatherForecast {
  siteName: string
  days: DayForecast[]
  fetchedAt: string
}

const WMO_LABEL: Record<number, { label: string; emoji: string }> = {
  0:  { label: '快晴', emoji: '☀️' },
  1:  { label: '晴れ', emoji: '🌤️' },
  2:  { label: '曇りがち', emoji: '⛅' },
  3:  { label: '曇り', emoji: '☁️' },
  45: { label: '霧', emoji: '🌫️' },
  48: { label: '霧', emoji: '🌫️' },
  51: { label: '霧雨', emoji: '🌦️' },
  53: { label: '霧雨', emoji: '🌦️' },
  55: { label: '霧雨', emoji: '🌦️' },
  61: { label: '小雨', emoji: '🌧️' },
  63: { label: '雨', emoji: '🌧️' },
  65: { label: '大雨', emoji: '🌧️' },
  71: { label: '小雪', emoji: '🌨️' },
  73: { label: '雪', emoji: '❄️' },
  75: { label: '大雪', emoji: '❄️' },
  80: { label: 'にわか雨', emoji: '🌦️' },
  81: { label: 'にわか雨', emoji: '🌧️' },
  82: { label: '強いにわか雨', emoji: '⛈️' },
  95: { label: '雷雨', emoji: '⛈️' },
  96: { label: '雷雨', emoji: '⛈️' },
  99: { label: '雷雨', emoji: '⛈️' },
}

export function getWeatherInfo(code: number): { label: string; emoji: string } {
  // round down to nearest known code
  const known = [0,1,2,3,45,48,51,53,55,61,63,65,71,73,75,80,81,82,95,96,99]
  const match = known.filter((c) => c <= code).pop() ?? 0
  return WMO_LABEL[match] ?? { label: '不明', emoji: '❓' }
}

export function isRainyCode(code: number): boolean {
  return code >= 51
}

export async function fetchWeather(
  latitude: number,
  longitude: number
): Promise<DayForecast[] | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=4`
    const res = await fetch(url, { next: { revalidate: 3600 } }) // cache 1h
    if (!res.ok) return null
    const data = await res.json()
    const daily = data.daily as {
      time: string[]
      weathercode: number[]
      temperature_2m_max: number[]
      temperature_2m_min: number[]
      precipitation_probability_max: number[]
    }
    return daily.time.map((date, i) => ({
      date,
      weatherCode: daily.weathercode[i],
      tempMax: Math.round(daily.temperature_2m_max[i]),
      tempMin: Math.round(daily.temperature_2m_min[i]),
      precipProb: daily.precipitation_probability_max[i] ?? 0,
    }))
  } catch {
    return null
  }
}
