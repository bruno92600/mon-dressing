export default async function WeatherWidget() {
  try {
    // On interroge la météo (mise en cache pendant 30 minutes pour ne pas saturer l'API)
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=48.9107&longitude=2.2890&current_weather=true",
      {
        next: { revalidate: 1800 },
      },
    );

    const data = await res.json();
    const weather = data.current_weather;

    if (!weather) return null;

    // On transforme le code technique de la météo en une jolie icône
    const code = weather.weathercode;
    let icon = "🌤️"; // Par défaut

    if (code === 0)
      icon = "☀️"; // Ciel dégagé
    else if (code === 1 || code === 2)
      icon = "⛅"; // Peu nuageux
    else if (code === 3)
      icon = "☁️"; // Couvert
    else if (code >= 45 && code <= 48)
      icon = "🌫️"; // Brouillard
    else if (code >= 51 && code <= 67)
      icon = "🌧️"; // Pluie
    else if (code >= 71 && code <= 77)
      icon = "❄️"; // Neige
    else if (code >= 95) icon = "⛈️"; // Orage

    return (
      <div className="flex items-center gap-2 text-sm text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-full shadow-inner border border-neutral-200">
        <span className="text-lg">{icon}</span>
        <span className="font-medium tracking-wide">
          {weather.temperature}°C
        </span>
      </div>
    );
  } catch (error) {
    return null; // Si l'API ne répond pas, on cache le widget pour ne pas casser le site
  }
}
