import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import WeatherVisual from "./WeatherVisual";

const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

const DEFAULT_LOCATION = {
  name: "Córdoba",
  country: "AR",
};

const THEME_ALIASES = {
  Haze: "Mist",
  Fog: "Mist",
  Smoke: "Mist",
  Dust: "Mist",
  Sand: "Mist",
  Ash: "Mist",
  Squall: "Thunderstorm",
  Tornado: "Thunderstorm",
};

const WEATHER_THEMES = {
  Default: {
    "--background-gradient":
      "linear-gradient(130deg, #0b1321 0%, #121d36 52%, #192a4d 100%)",
    "--surface-color": "rgba(12, 20, 40, 0.78)",
    "--panel-border": "rgba(255, 255, 255, 0.08)",
    "--shadow-color": "rgba(5, 8, 16, 0.65)",
    "--text-color": "#f5f7ff",
    "--muted-color": "rgba(229, 233, 255, 0.76)",
    "--accent-color": "#8fb4ff",
  },
  Clear: {
    "--background-gradient":
      "linear-gradient(135deg, #ffb347 0%, #ffcc33 45%, #ff6f61 100%)",
    "--surface-color": "rgba(44, 24, 8, 0.62)",
    "--panel-border": "rgba(255, 255, 255, 0.28)",
    "--shadow-color": "rgba(120, 38, 12, 0.45)",
    "--text-color": "#fff9f0",
    "--muted-color": "rgba(255, 240, 216, 0.82)",
    "--accent-color": "#ff9a52",
  },
  Clouds: {
    "--background-gradient":
      "linear-gradient(135deg, #4b5563 0%, #9ca3af 38%, #d1d5db 100%)",
    "--surface-color": "rgba(24, 30, 40, 0.72)",
    "--panel-border": "rgba(255, 255, 255, 0.22)",
    "--shadow-color": "rgba(16, 20, 28, 0.55)",
    "--text-color": "#f4f6fb",
    "--muted-color": "rgba(225, 230, 240, 0.78)",
    "--accent-color": "#8da2c9",
  },
  Rain: {
    "--background-gradient":
      "linear-gradient(135deg, #0f1c3f 0%, #1c305c 50%, #274b82 100%)",
    "--surface-color": "rgba(10, 22, 46, 0.68)",
    "--panel-border": "rgba(119, 163, 255, 0.32)",
    "--shadow-color": "rgba(7, 14, 28, 0.7)",
    "--text-color": "#e8f0ff",
    "--muted-color": "rgba(187, 205, 241, 0.82)",
    "--accent-color": "#76a8ff",
  },
  Snow: {
    "--background-gradient":
      "linear-gradient(135deg, #dbe8ff 0%, #f5fbff 50%, #c4ddf9 100%)",
    "--surface-color": "rgba(21, 48, 80, 0.55)",
    "--panel-border": "rgba(255, 255, 255, 0.6)",
    "--shadow-color": "rgba(6, 24, 48, 0.45)",
    "--text-color": "#0c1b2f",
    "--muted-color": "rgba(44, 74, 112, 0.65)",
    "--accent-color": "#5aa2ff",
  },
  Thunderstorm: {
    "--background-gradient":
      "linear-gradient(135deg, #1f1147 0%, #2c1c63 40%, #040410 100%)",
    "--surface-color": "rgba(12, 10, 26, 0.78)",
    "--panel-border": "rgba(153, 125, 255, 0.32)",
    "--shadow-color": "rgba(6, 4, 18, 0.7)",
    "--text-color": "#ece8ff",
    "--muted-color": "rgba(186, 176, 235, 0.76)",
    "--accent-color": "#a88bff",
  },
  Drizzle: {
    "--background-gradient":
      "linear-gradient(135deg, #7aa9ff 0%, #9ebff9 45%, #d1def5 100%)",
    "--surface-color": "rgba(36, 52, 88, 0.64)",
    "--panel-border": "rgba(255, 255, 255, 0.28)",
    "--shadow-color": "rgba(20, 32, 54, 0.55)",
    "--text-color": "#f8fbff",
    "--muted-color": "rgba(223, 234, 255, 0.78)",
    "--accent-color": "#87b7ff",
  },
  Mist: {
    "--background-gradient":
      "linear-gradient(135deg, #5c6b7c 0%, #7f8d9d 48%, #b1bcc7 100%)",
    "--surface-color": "rgba(28, 36, 48, 0.7)",
    "--panel-border": "rgba(255, 255, 255, 0.26)",
    "--shadow-color": "rgba(12, 16, 22, 0.55)",
    "--text-color": "#edf1f5",
    "--muted-color": "rgba(206, 214, 223, 0.75)",
    "--accent-color": "#9db8d8",
  },
};

const Loader = ({ text }) => (
  <span className="loader" role="status" aria-live="polite">
    <span className="spinner" />
    <span className="loader__text">{text}</span>
  </span>
);

const formatLocationLabel = (location) => {
  if (!location) return "";
  const pieces = [location.name];
  if (location.state) pieces.push(location.state);
  if (location.country) pieces.push(location.country);
  return pieces.filter(Boolean).join(", ");
};

export default function WeatherDisplay() {
  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState(null);
  const [quote, setQuote] = useState(null);
  const [music, setMusic] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION);
  const initialised = useRef(false);

  const resolvedCondition = weather?.weather?.[0]?.main;

  const mood = useMemo(() => {
    if (!resolvedCondition) return "Default";
    if (WEATHER_THEMES[resolvedCondition]) return resolvedCondition;
    return THEME_ALIASES[resolvedCondition] || "Default";
  }, [resolvedCondition]);

  const applyTheme = useCallback((themeKey) => {
    const theme = WEATHER_THEMES[themeKey] || WEATHER_THEMES.Default;
    const root = document.documentElement;
    const body = document.body;

    Object.entries(WEATHER_THEMES.Default).forEach(([token, value]) => {
      root.style.setProperty(token, value);
    });

    Object.entries(theme).forEach(([token, value]) => {
      root.style.setProperty(token, value);
    });

    if (theme["--background-gradient"]) {
      body.style.background = theme["--background-gradient"];
    }
  }, []);

  const handleExperienceLoad = useCallback(
    async (location) => {
      const target =
        location?.name || location?.lat ? location : selectedLocation;
      const params = {};

      if (target.lat && target.lon) {
        params.lat = target.lat;
        params.lon = target.lon;
      } else {
        params.city = target.name || query.trim() || DEFAULT_LOCATION.name;
      }

      setIsLoading(true);
      setError(null);

      try {
        const weatherResponse = await api.get("/weather", { params });
        const weatherData = weatherResponse.data;
        setWeather(weatherData);

        const nextLocation = {
          name: weatherData.name,
          state: weatherData.sys?.state || null,
          country: weatherData.sys?.country || target.country || null,
          lat: weatherData.coord?.lat,
          lon: weatherData.coord?.lon,
        };

        setSelectedLocation(nextLocation);
        setQuery(formatLocationLabel(nextLocation));

        const mainCondition = weatherData.weather?.[0]?.main;
        const derivedMood =
          THEME_ALIASES[mainCondition] || mainCondition || "Default";

        const [quoteResponse, musicResponse] = await Promise.all([
          api.get("/ai-quote", { params: { mood: derivedMood } }),
          api.get("/music", { params: { mood: derivedMood } }),
        ]);

        setQuote(quoteResponse.data);
        setMusic(musicResponse.data?.track || musicResponse.data);
      } catch (requestError) {
        const message =
          requestError.response?.data?.error ||
          requestError.message ||
          "No pudimos actualizar los datos en este momento.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [query, selectedLocation]
  );

  useEffect(() => {
    applyTheme(mood);
  }, [mood, applyTheme]);

  useEffect(() => {
    if (initialised.current) {
      return;
    }
    initialised.current = true;
    setQuery(formatLocationLabel(DEFAULT_LOCATION));
    handleExperienceLoad(DEFAULT_LOCATION);
  }, [handleExperienceLoad]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      return undefined;
    }

    const controller = new AbortController();
    const debounce = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const response = await api.get("/geocode", {
          params: { q: trimmed },
          signal: controller.signal,
        });
        setSuggestions(response.data || []);
      } catch (suggestionError) {
        if (!axios.isCancel(suggestionError)) {
          setSuggestions([]);
        }
      } finally {
        setIsSuggesting(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(debounce);
    };
  }, [query]);

  const onSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }

      handleExperienceLoad({ name: trimmed });
      setSuggestions([]);
    },
    [handleExperienceLoad, query]
  );

  const onSelectSuggestion = useCallback(
    (suggestion) => {
      setQuery(formatLocationLabel(suggestion));
      setSuggestions([]);
      handleExperienceLoad(suggestion);
    },
    [handleExperienceLoad]
  );

  const hideSuggestions = useCallback(() => {
    setTimeout(() => setSuggestions([]), 140);
  }, []);

  const feelsLike = weather?.main?.feels_like;
  const humidity = weather?.main?.humidity;
  const wind = weather?.wind?.speed;

  return (
    <div className="app" data-loading={isLoading}>
      <div className="app__backdrop" aria-hidden="true" />
      <div className="shell">
        <header className="shell__header">
          <div>
            <p className="eyebrow">MoodWeather</p>
            <h1>El clima que inspira tu mood</h1>
            <p className="subtitle">
              Explorá el clima de cualquier ciudad y recibí una canción y una
              frase que acompañen el momento.
            </p>
          </div>
          <WeatherVisual condition={resolvedCondition} />
        </header>

        <section className="search" aria-label="Buscar ciudad">
          <label className="search__label" htmlFor="search-city">
            Escribí una ciudad o seleccioná una sugerencia
          </label>
          <form className="search__controls" onSubmit={onSubmit}>
            <div className="search__input-wrapper">
              <input
                id="search-city"
                type="text"
                value={query}
                autoComplete="off"
                placeholder="Ej. Córdoba, Argentina"
                onChange={(event) => setQuery(event.target.value)}
                onFocus={(event) => event.target.select()}
                onBlur={hideSuggestions}
              />
              {isSuggesting && <Loader text="Buscando sugerencias" />}
              {suggestions.length > 0 && (
                <ul className="suggestions" role="listbox">
                  {suggestions.map((suggestion) => {
                    const label = formatLocationLabel(suggestion);
                    return (
                      <li key={`${suggestion.lat}-${suggestion.lon}`}>
                        <button
                          type="button"
                          className="suggestions__item"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => onSelectSuggestion(suggestion)}
                          aria-selected={
                            selectedLocation?.lat === suggestion.lat &&
                            selectedLocation?.lon === suggestion.lon
                          }
                          role="option"
                        >
                          {label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <button type="submit" disabled={isLoading || !query.trim()}>
              {isLoading ? "Actualizando…" : "Actualizar"}
            </button>
          </form>
        </section>

        {error && (
          <div className="notice" role="alert">
            <strong>No pudimos actualizar los datos.</strong>
            <span>{error}</span>
          </div>
        )}

        <section className="panel">
          <div className="panel__section weather">
            <div className="panel__header">
              <h2>Clima actual</h2>
              {isLoading && <Loader text="Sincronizando" />}
            </div>
            {weather ? (
              <>
                <div className="weather__primary">
                  <p className="weather__temp">
                    {Math.round(weather.main.temp)}
                    <sup>°C</sup>
                  </p>
                  <div>
                    <p className="weather__condition">
                      {weather.weather?.[0]?.description}
                    </p>
                    <p className="weather__location">
                      {formatLocationLabel(selectedLocation)}
                    </p>
                  </div>
                </div>
                <dl className="weather__meta">
                  <div>
                    <dt>Sensación</dt>
                    <dd>
                      {typeof feelsLike === "number"
                        ? `${Math.round(feelsLike)} °C`
                        : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt>Humedad</dt>
                    <dd>
                      {typeof humidity === "number" ? `${humidity}%` : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt>Viento</dt>
                    <dd>
                      {typeof wind === "number"
                        ? `${Math.round(wind)} km/h`
                        : "-"}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <Loader text="Cargando clima" />
            )}
          </div>

          <div className="panel__section">
            <div className="panel__header">
              <h2>Frase para tu mood</h2>
              {isLoading && <Loader text="Afinando palabras" />}
            </div>
            {quote ? (
              <>
                <p className="mood">{quote.text}</p>
                {quote.author && (
                  <p className="panel__message">— {quote.author}</p>
                )}
              </>
            ) : (
              <Loader text="Pensando" />
            )}
          </div>

          <div className="panel__section music">
            <div className="panel__header">
              <h2>Canción sugerida</h2>
              {isLoading && <Loader text="Buscando ritmo" />}
            </div>
            {music ? (
              <>
                <div className="music__meta">
                  {music.artwork && (
                    <img
                      className="music__art"
                      src={music.artwork}
                      alt={music.title}
                      loading="lazy"
                    />
                  )}
                  <div>
                    <p className="music__title">{music.title}</p>
                    {music.artist && (
                      <p className="music__artist">{music.artist}</p>
                    )}
                  </div>
                </div>
                <div className="music__actions">
                  {music.url && (
                    <a
                      className="link-button"
                      href={music.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Escuchar en SoundCloud
                    </a>
                  )}
                </div>
              </>
            ) : (
              <Loader text="Seleccionando música" />
            )}
          </div>
        </section>

        <footer className="footnote">
          <span>
            Datos meteorológicos provistos por OpenWeather. Música y frases se
            adaptan automáticamente al clima.
          </span>
          <span>Hecho con calma y un poco de magia atmosférica.</span>
        </footer>
      </div>
    </div>
  );
}
