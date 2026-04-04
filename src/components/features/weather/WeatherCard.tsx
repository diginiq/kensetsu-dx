import { DayForecast, getWeatherInfo, isRainyCode } from '@/lib/weather'

interface Props {
  siteName: string
  days: DayForecast[]
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

export function WeatherCard({ siteName, days }: Props) {
  const tomorrowRainy = days[1] ? isRainyCode(days[1].weatherCode) : false

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
        <p className="text-xs font-medium text-gray-500">🌤 {siteName} の天気予報</p>
        <p className="text-xs text-gray-400">Open-Meteo</p>
      </div>
      {tomorrowRainy && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <p className="text-xs font-medium text-blue-700">⚠️ 明日は雨または悪天候の予報があります</p>
        </div>
      )}
      <div className="grid grid-cols-4 divide-x divide-gray-100">
        {days.map((day) => {
          const d = new Date(day.date)
          const dow = DAY_NAMES[d.getDay()]
          const { emoji } = getWeatherInfo(day.weatherCode)
          return (
            <div key={day.date} className="px-2 py-3 text-center">
              <p className="text-xs text-gray-400">
                {d.getMonth() + 1}/{d.getDate()}({dow})
              </p>
              <p className="text-2xl my-1">{emoji}</p>
              <p className="text-xs font-bold text-red-500">{day.tempMax}°</p>
              <p className="text-xs text-blue-500">{day.tempMin}°</p>
              {day.precipProb > 0 && (
                <p className="text-xs text-blue-600 mt-0.5">💧{day.precipProb}%</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
