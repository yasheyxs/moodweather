import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import WeatherVisual from "./components/WeatherVisual";
import "./App.css";

const weatherThemes = {
  Clear: {
    background:
      "linear-gradient(135deg, #0b1d3c 0%, #235aa6 52%, #f6c667 100%)",
    body: "#0b1d3c",
    surface: "rgba(9, 18, 36, 0.55)",
    border: "rgba(255, 255, 255, 0.12)",
    accent: "#ffd36f",
    text: "#f7f9ff",
    muted: "rgba(243, 245, 255, 0.72)",
    shadow: "rgba(0, 0, 0, 0.45)",
  },
  Rain: {
    background:
      "linear-gradient(145deg, #141e30 0%, #243b55 45%, #4b6cb7 100%)",
    body: "#101726",
    surface: "rgba(12, 20, 34, 0.6)",
    border: "rgba(255, 255, 255, 0.1)",
    accent: "#7fb7ff",
    text: "#f1f4ff",
    muted: "rgba(220, 231, 255, 0.72)",
    shadow: "rgba(0, 0, 0, 0.5)",
  },
  Clouds: {
    background:
      "linear-gradient(140deg, #1b2735 0%, #485461 55%, #9dc5c3 100%)",
    body: "#161f2b",
    surface: "rgba(18, 26, 38, 0.6)",
    border: "rgba(255, 255, 255, 0.08)",
    accent: "#a7c7dc",
    text: "#f5f7ff",
    muted: "rgba(230, 236, 255, 0.7)",
    shadow: "rgba(0, 0, 0, 0.45)",
  },
  Snow: {
    background:
      "linear-gradient(150deg, #102a43 0%, #486581 55%, #d9e2ec 100%)",
    body: "#0c1c2d",
    surface: "rgba(16, 40, 60, 0.55)",
    border: "rgba(255, 255, 255, 0.2)",
    accent: "#9dd6ff",
    text: "#f8fbff",
    muted: "rgba(220, 235, 255, 0.82)",
    shadow: "rgba(8, 24, 38, 0.35)",
  },
  Thunderstorm: {
    background:
      "linear-gradient(150deg, #0b0f1c 0%, #2c3e50 50%, #8e9eab 100%)",
    body: "#060a12",
    surface: "rgba(14, 18, 32, 0.65)",
    border: "rgba(255, 255, 255, 0.1)",
    accent: "#ffd155",
    text: "#f2f5ff",
    muted: "rgba(220, 225, 255, 0.7)",
    shadow: "rgba(0, 0, 0, 0.55)",
  },
  Mist: {
    background:
      "linear-gradient(160deg, #1c2331 0%, #3a506b 55%, #b4c5d6 100%)",
    body: "#121926",
    surface: "rgba(20, 28, 40, 0.55)",
    border: "rgba(255, 255, 255, 0.1)",
    accent: "#cbd9ff",
    text: "#f4f6fb",
    muted: "rgba(230, 235, 255, 0.75)",
    shadow: "rgba(5, 12, 24, 0.45)",
  },
  Default: {
    background:
      "linear-gradient(150deg, #0f172a 0%, #1f2a44 45%, #4f46e5 100%)",
    body: "#0b1020",
    surface: "rgba(13, 20, 37, 0.6)",
    border: "rgba(255, 255, 255, 0.1)",
    accent: "#8fb4ff",
    text: "#f4f6ff",
    muted: "rgba(220, 232, 255, 0.75)",
    shadow: "rgba(0, 0, 0, 0.5)",
  },
};

const relatedTheme = {
  Drizzle: "Rain",
  Haze: "Mist",
  Fog: "Mist",
  Smoke: "Mist",
  Dust: "Mist",
  Sand: "Mist",
  Ash: "Mist",
  Squall: "Thunderstorm",
  Tornado: "Thunderstorm",
};

const parseAxiosError = (error, fallbackMessage) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }
  return fallbackMessage;
};

function Loader({ label }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="loader__text">{label}</span>
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState(null);
  const [mood, setMood] = useState("");
  const [track, setTrack] = useState(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const [lastRequest, setLastRequest] = useState(null);
  const [status, setStatus] = useState({
    weather: "idle",
    mood: "idle",
    music: "idle",
  });
  const [errors, setErrors] = useState({
    weather: null,
    mood: null,
    music: null,
  });

  const condition = weather?.weather?.[0]?.main;
  const theme = useMemo(() => {
    if (!condition) {
      return weatherThemes.Default;
    }
    const key = weatherThemes[condition]
      ? condition
      : relatedTheme[condition] || "Default";
    return weatherThemes[key] || weatherThemes.Default;
  }, [condition]);

  useEffect(() => {
    document.body.style.background = theme.body;
    return () => {
      document.body.style.background = "";
    };
  }, [theme]);

  const themeStyle = useMemo(
    () => ({
      "--background-gradient": theme.background,
      "--surface-color": theme.surface,
      "--panel-border": theme.border,
      "--accent-color": theme.accent,
      "--text-color": theme.text,
      "--muted-color": theme.muted,
      "--shadow-color": theme.shadow,
    }),
    [theme]
  );

  const fetchWeather = useCallback(async (params) => {
    setStatus((prev) => ({
      ...prev,
      weather: "loading",
      mood: "idle",
      music: "idle",
    }));
    setErrors((prev) => ({ ...prev, weather: null }));
    setMood("");
    setTrack(null);
    setLastRequest(params);

    try {
      const { data } = await axios.get("/api/weather", { params });
      setWeather(data);
      setStatus((prev) => ({ ...prev, weather: "success" }));
    } catch (err) {
      console.error("Weather request failed", err);
      setStatus((prev) => ({ ...prev, weather: "error" }));
      const message = parseAxiosError(
        err,
        "No pudimos obtener el clima ahora mismo. Intenta nuevamente en unos segundos."
      );
      setErrors((prev) => ({
        ...prev,
        weather: message,
      }));
    }
  }, []);

  const fetchExperience = useCallback(() => {
    if (!weather) {
      return () => {};
    }

    const descriptor = weather.weather?.[0];
    if (!descriptor) {
      return () => {};
    }

    const payload = {
      weather: descriptor.main,
      description: descriptor.description,
      temperature:
        weather.main?.temp != null ? Math.round(weather.main.temp) : undefined,
      feelsLike:
        weather.main?.feels_like != null
          ? Math.round(weather.main.feels_like)
          : undefined,
      location: weather.name,
    };

    setStatus((prev) => ({ ...prev, mood: "loading", music: "loading" }));
    setErrors((prev) => ({ ...prev, mood: null, music: null }));
    setMood("");
    setTrack(null);

    let cancelled = false;

    axios
      .post("/api/mood", payload)
      .then(({ data }) => {
        if (cancelled) return;
        const message = (data?.message || data?.text || "").trim();
        setMood(message);
        setStatus((prev) => ({ ...prev, mood: "success" }));
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Mood generation failed", error);
        setMood("");
        setStatus((prev) => ({ ...prev, mood: "error" }));
        setErrors((prev) => ({
          ...prev,
          mood: parseAxiosError(
            error,
            "No pudimos generar una frase emocional. Reintenta más tarde."
          ),
        }));
      });

    axios
      .get("/api/music", {
        params: {
          weather: descriptor.main,
          mood: descriptor.description,
          city: weather.name,
        },
      })
      .then(({ data }) => {
        if (cancelled) return;
        const suggestedTrack = data?.track || null;
        if (!suggestedTrack) {
          setTrack(null);
          setStatus((prev) => ({ ...prev, music: "error" }));
          setErrors((prev) => ({
            ...prev,
            music: "No encontramos música adecuada ahora mismo.",
          }));
          return;
        }
        setTrack(suggestedTrack);
        setStatus((prev) => ({ ...prev, music: "success" }));
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Music suggestion failed", error);
        setTrack(null);
        setStatus((prev) => ({ ...prev, music: "error" }));
        setErrors((prev) => ({
          ...prev,
          music: parseAxiosError(
            error,
            "Tuvimos problemas al buscar música. Intenta otra vez."
          ),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [weather]);

  useEffect(() => {
    const cancel = fetchExperience();
    return () => {
      if (typeof cancel === "function") {
        cancel();
      }
    };
  }, [weather, fetchExperience]);

  useEffect(() => {
    const fallbackCity = "Buenos Aires";
    if (!navigator.geolocation) {
      fetchWeather({ city: fallbackCity });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeather({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => {
        fetchWeather({ city: fallbackCity });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [fetchWeather]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!query.trim()) {
      return;
    }
    fetchWeather({ city: query.trim() });
  };

  const handleRetryWeather = () => {
    if (lastRequest) {
      fetchWeather(lastRequest);
    }
  };

  const handleRefreshExperience = () => {
    fetchExperience();
  };

  const formattedTemp = useMemo(() => {
    if (weather?.main?.temp == null) {
      return null;
    }
    return Math.round(weather.main.temp);
  }, [weather]);

  const feelsLike = useMemo(() => {
    if (weather?.main?.feels_like == null) {
      return null;
    }
    return Math.round(weather.main.feels_like);
  }, [weather]);

  return (
    <div className="app" style={themeStyle}>
      <div className="app__backdrop" />
      <main className="shell">
        <header className="shell__header">
          <div>
            <p className="eyebrow">MoodWeather</p>
            <h1>Clima, emociones y música sincronizados</h1>
            <p className="subtitle">
              Descubre cómo el clima influye en tu vibra y déjate acompañar por
              una sugerencia musical hecha a medida.
            </p>
          </div>
          <WeatherVisual condition={condition} />
        </header>

        <form className="search" onSubmit={handleSubmit}>
          <label className="search__label" htmlFor="city-input">
            Busca otra ciudad
          </label>
          <div className="search__controls">
            <input
              id="city-input"
              type="text"
              value={query}
              placeholder="Madrid, Montevideo, Ciudad de México..."
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
            <button type="submit">Actualizar</button>
          </div>
        </form>

        <section className="panel">
          <div className="panel__section">
            <div className="panel__header">
              <h2>Clima actual</h2>
              {status.weather === "loading" && (
                <Loader label="Consultando clima" />
              )}
              {status.weather === "error" && (
                <button
                  type="button"
                  className="link-button"
                  onClick={handleRetryWeather}
                >
                  Reintentar
                </button>
              )}
            </div>
            {status.weather === "error" && errors.weather && (
              <p className="panel__message">{errors.weather}</p>
            )}
            {status.weather !== "error" && weather && (
              <div className="weather">
                <div className="weather__primary">
                  <span className="weather__temp">
                    {formattedTemp != null ? formattedTemp : "--"}
                    <sup>°C</sup>
                  </span>
                  <div>
                    <p className="weather__condition">
                      {weather.weather?.[0]?.description}
                    </p>
                    <p className="weather__location">{weather.name}</p>
                  </div>
                </div>
                <dl className="weather__meta">
                  <div>
                    <dt>Sensación</dt>
                    <dd>{feelsLike != null ? `${feelsLike}°C` : "-"}</dd>
                  </div>
                  <div>
                    <dt>Humedad</dt>
                    <dd>
                      {weather.main?.humidity != null
                        ? `${weather.main.humidity}%`
                        : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt>Viento</dt>
                    <dd>
                      {weather.wind?.speed != null
                        ? `${Math.round(weather.wind.speed)} km/h`
                        : "-"}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          <div className="panel__section">
            <div className="panel__header">
              <h2>Frase MoodWeather</h2>
              {status.mood === "loading" && (
                <Loader label="Escribiendo con IA" />
              )}
              {status.mood === "error" && (
                <button
                  type="button"
                  className="link-button"
                  onClick={handleRefreshExperience}
                >
                  Reintentar
                </button>
              )}
            </div>
            {status.mood === "error" && errors.mood && (
              <p className="panel__message">{errors.mood}</p>
            )}
            {status.mood !== "error" && mood && (
              <blockquote className="mood" cite="https://huggingface.co/models">
                {mood}
              </blockquote>
            )}
          </div>

          <div className="panel__section">
            <div className="panel__header">
              <h2>Recomendación musical</h2>
              {status.music === "loading" && (
                <Loader label="Buscando en SoundCloud" />
              )}
              {status.music === "error" && (
                <button
                  type="button"
                  className="link-button"
                  onClick={handleRefreshExperience}
                >
                  Reintentar
                </button>
              )}
            </div>
            {status.music === "error" && errors.music && (
              <p className="panel__message">{errors.music}</p>
            )}
            {status.music === "success" && track && (
              <div className="music">
                <div className="music__meta">
                  {track.artwork_url && (
                    <img
                      className="music__art"
                      src={track.artwork_url}
                      alt={`Arte de ${track.title}`}
                    />
                  )}
                  <p className="music__title">{track.title}</p>
                  <p className="music__artist">{track.artist}</p>
                  <div className="music__actions">
                    <button
                      type="button"
                      className="toggle"
                      onClick={() => setAutoPlay((value) => !value)}
                    >
                      {autoPlay ? "Autoplay activado" : "Autoplay en pausa"}
                    </button>
                    <a
                      href={track.permalink_url}
                      target="_blank"
                      rel="noreferrer"
                      className="link-button"
                    >
                      Abrir en SoundCloud
                    </a>
                  </div>
                </div>
                <div className="music__player">
                  <img
                    src={track.artwork_url || "/default-cover.jpg"}
                    alt={track.title}
                    className="music__cover"
                  />
                  <h3>{track.title}</h3>
                  <p>{track.artist}</p>
                  <a
                    href={track.permalink_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="music__link"
                  >
                    🎧 Escuchar en SoundCloud
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="footnote">
          <p>
            Datos meteorológicos por OpenWeather · Frases generadas con modelos
            de HuggingFace · Música sugerida vía SoundCloud.
          </p>
          <button
            type="button"
            className="link-button"
            onClick={handleRefreshExperience}
          >
            Actualizar experiencia
          </button>
        </footer>
      </main>
    </div>
  );
}
