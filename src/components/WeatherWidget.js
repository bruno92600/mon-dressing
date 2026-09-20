"use client";

import { useState, useEffect } from "react";

export default function WeatherWidget() {
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Demander la géolocalisation au chargement
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await fetchWeather(latitude, longitude);
        },
        (error) => {
          console.error("Géolocalisation refusée ou indisponible", error);
          setError("Localisation requise");
          // Fallback sur Asnières si refus
          fetchWeather(48.9107, 2.289);
        },
      );
    } else {
      // Fallback si navigateur non compatible
      fetchWeather(48.9107, 2.289);
    }
  }, []);

  const fetchWeather = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max&timezone=Europe/Paris&forecast_days=3`,
      );
      const data = await res.json();
      setWeatherData(data.daily);
    } catch (err) {
      console.error(err);
      setError("Erreur météo");
    }
  };

  const getWeatherIcon = (code) => {
    if (code === 0) return "☀️";
    if (code === 1 || code === 2) return "⛅";
    if (code === 3) return "☁️";
    if (code >= 45 && code <= 48) return "🌫️";
    if (code >= 51 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "❄️";
    if (code >= 95) return "⛈️";
    return "🌤️";
  };

  const getDayLabel = (index, dateString) => {
    if (index === 0) return "Auj";
    if (index === 1) return "Dem";
    const date = new Date(dateString);
    return date
      .toLocaleDateString("fr-FR", { weekday: "short" })
      .replace(".", "");
  };

  if (!weatherData)
    return (
      <div className="text-xs text-neutral-400 bg-neutral-50 px-4 py-2 rounded-full border border-neutral-200">
        Recherche du ciel...
      </div>
    );

  return (
    <div className="flex items-center gap-3 text-xs text-neutral-600 bg-neutral-100 px-4 py-2 rounded-full shadow-inner border border-neutral-200 whitespace-nowrap">
      {weatherData.time.map((time, index) => (
        <div
          key={time}
          className="flex items-center gap-1.5 border-r last:border-0 border-neutral-300 pr-3 last:pr-0"
        >
          <span className="font-bold uppercase text-[9px] tracking-wider text-neutral-400">
            {getDayLabel(index, time)}
          </span>
          <span className="text-sm">
            {getWeatherIcon(weatherData.weathercode[index])}
          </span>
          <span className="font-medium tracking-wide">
            {Math.round(weatherData.temperature_2m_max[index])}°
          </span>
        </div>
      ))}
    </div>
  );
}
