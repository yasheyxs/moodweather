import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;
const OPENROUTER_TOKEN =
  process.env.OPENROUTER_API_KEY ||
  "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";

const SPOTIFY_CLIENT_ID =
  process.env.SPOTIFY_CLIENT_ID || "7437b15f5aa744f4a709fe90e5ce1603";
const SPOTIFY_CLIENT_SECRET =
  process.env.SPOTIFY_CLIENT_SECRET || "3c66b15030eb4c4d829269414e3d05ba";

app.use(cors());
app.use(express.json());

function ensureKey(key, name) {
  if (!key) {
    throw new Error(
      `Falta la clave de ${name}. Añádela en el archivo .env antes de iniciar el servidor.`
    );
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/weather", async (req, res) => {
  try {
    ensureKey(OPENWEATHER_KEY, "OpenWeather");
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  const { city, lat, lon } = req.query;

  if (!city && (!lat || !lon)) {
    return res.status(400).json({
      error:
        "Proporciona una ciudad o coordenadas (lat y lon) para consultar el clima.",
    });
  }

  const params = {
    appid: OPENWEATHER_KEY,
    units: "metric",
    lang: "es",
  };

  if (city) {
    params.q = city;
  } else {
    params.lat = lat;
    params.lon = lon;
  }

  try {
    const { data } = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params,
      }
    );
    res.json(data);
  } catch (error) {
    const status = error.response?.status || 500;
    if (status === 404) {
      return res.status(404).json({
        error:
          "No encontramos esa ciudad. Intenta con otro nombre o revisa la ortografía.",
      });
    }
    if (status === 401) {
      return res.status(500).json({
        error: "La clave de OpenWeather no es válida. Revisa tu configuración.",
      });
    }
    console.error("OpenWeather error", error.message);
    return res
      .status(500)
      .json({ error: "No pudimos obtener el clima en este momento." });
  }
});

const DEFAULT_MOOD_MESSAGE =
  "El clima invita a disfrutar de un momento de calma.";

function cleanModelOutput(text) {
  if (typeof text !== "string") {
    return "";
  }

  const UNWANTED_TOKEN_PATTERN =
    /(?:<\/?s>|<\|(?:im_[a-z]+|startoftext|endoftext)\|>|\[\/?B?_?INST\]|\[(?:BOS|EOS)\]|#{2,}|\|{2,}|```)/gi;
  const EDGE_QUOTES_PATTERN = /^[`'"“”‘’\s]+|[`'"“”‘’\s]+$/g;
  const EDGE_SYMBOLS_PATTERN = /^[\[\](){}<>]+|[\[\](){}<>]+$/g;

  let cleaned = text
    .replace(UNWANTED_TOKEN_PATTERN, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?!\s|$)/g, "$1 ")
    .replace(/\s+/g, " ")
    .replace(EDGE_QUOTES_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();

  cleaned = cleaned.replace(EDGE_SYMBOLS_PATTERN, "");

  cleaned = cleaned.replace(/\s+([,.;:!?])/g, "$1");
  cleaned = cleaned.replace(/([,.;:!?])(?!\s|$)/g, "$1 ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  cleaned = cleaned.replace(EDGE_SYMBOLS_PATTERN, "");

  if (!cleaned) {
    return "";
  }

  const firstLetterIndex = cleaned.search(/[A-Za-zÀ-ÖØ-öø-ÿÑñ]/);
  if (firstLetterIndex >= 0) {
    cleaned =
      cleaned.slice(0, firstLetterIndex) +
      cleaned.charAt(firstLetterIndex).toUpperCase() +
      cleaned.slice(firstLetterIndex + 1);
  }

  return cleaned;
}

function extractRecommendation(message) {
  if (typeof message !== "string") {
    return null;
  }

  const normalised = message.replace(/\s+/g, " ").trim();
  if (!normalised) {
    return null;
  }

  const patterns = [
    {
      type: "track",
      regex:
        /recomendaci[oó]n(?: musical)?(?: es)?:?\s*["“”']?([^"“”']{3,})["“”']?(?:\s+de\s+([^.,;]+))?/i,
    },
    {
      type: "track",
      regex:
        /escucha(?:r)?(?:\s+la)?(?:\s+canci[oó]n|\s+melod[ií]a|\s+pieza)?\s*["“”']?([^"“”']{3,})["“”']?(?:\s+de\s+([^.,;]+))?/i,
    },
    {
      type: "artist",
      regex:
        /escucha(?:r)? a ([^.,;\n]+?)(?:\s+(?:para|y|con|porque)|[.,;]|$)/i,
    },
    {
      type: "track",
      regex:
        /(tema|canci[oó]n)\s+recomendada:?\s*["“”']?([^"“”']{3,})["“”']?(?:\s+de\s+([^.,;]+))?/i,
      groups: [2, 3],
    },
  ];

  for (const pattern of patterns) {
    const match = normalised.match(pattern.regex);
    if (match) {
      const groupIndexes = pattern.groups || [1, 2];
      const primary = match[groupIndexes[0]]?.trim();
      const secondary = match[groupIndexes[1]]?.trim();
      if (primary) {
        const query = secondary ? `${primary} ${secondary}` : primary;
        return { query: query.replace(/\s+/g, " "), type: pattern.type };
      }
    }
  }

  const quoted = normalised.match(/["“”']([^"“”']{3,})["“”']/);
  if (quoted) {
    return { query: quoted[1].trim(), type: "track" };
  }

  return null;
}

async function callOpenRouter(payload, attempt = 0, maxAttempts = 3) {
  const url = "https://openrouter.ai/api/v1/chat/completions";

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${OPENROUTER_TOKEN}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "MoodWeather",
      },
      timeout: 20000,
    });

    const { status, data } = response;
    const preview = JSON.stringify(data).slice(0, 200);
    console.log(`[OpenRouter] POST ${url} -> ${status}`, preview);

    const text = data?.choices?.[0]?.message?.content;

    if (typeof text === "string") {
      return text.trim();
    }

    return "";
  } catch (error) {
    const status = error.response?.status;
    const responseData = error.response?.data;
    console.error(
      `[OpenRouter] Error ${url} -> ${status ?? "unknown"}`,
      responseData || error.message
    );

    if (status === 429 || status === 503) {
      if (attempt + 1 < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return callOpenRouter(payload, attempt + 1, maxAttempts);
      }
    }

    throw error;
  }
}

async function generateMood(prompt, maxAttempts = 2) {
  ensureKey(OPENROUTER_TOKEN, "OpenRouter");

  const payload = {
    model: "mistralai/mistral-7b-instruct",
    messages: [
      {
        role: "system",
        content:
          "Eres MoodWeather, una IA poética que convierte el clima en mensajes inspiradores en español.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 120,
    temperature: 0.8,
  };

  let lastError = null;

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    try {
      const raw = await callOpenRouter(payload);
      const cleaned = cleanModelOutput(raw);
      if (cleaned) {
        return { message: cleaned, fallback: false };
      }
    } catch (error) {
      lastError = error;
      console.error("Mood generation attempt failed", error.message || error);
    }
  }
  if (lastError) {
    console.warn(
      "Falling back to default mood message after exhausting attempts",
      lastError.message || lastError
    );
  }

  return { message: DEFAULT_MOOD_MESSAGE, fallback: true };
}

app.post("/api/mood", async (req, res) => {
  const { weather, description, temperature, feelsLike, location } = req.body;

  if (!weather) {
    return res
      .status(400)
      .json({ error: "Especifica al menos el estado del clima." });
  }

  const pieces = [
    location ? `Hoy en ${location}` : "Hoy",
    description
      ? `el clima se siente ${description}.`
      : "hay cambios en el clima.",
    typeof temperature === "number"
      ? `La temperatura ronda los ${temperature}°C`
      : "",
    typeof feelsLike === "number" ? `con una sensación de ${feelsLike}°C.` : "",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const prompt = `Eres MoodWeather, una IA poética y empática que traduce el clima en mensajes inspiradores en español.
${pieces}
Escribe una frase breve (máximo 40 palabras) que mezcle emociones, clima y sugerencias musicales suaves.`;

  try {
    const { message, fallback } = await generateMood(prompt);
    const recommendation = fallback ? null : extractRecommendation(message);
    res.json({
      message: message || DEFAULT_MOOD_MESSAGE,
      fallback: Boolean(fallback),
      recommendation,
    });
  } catch (error) {
    console.error("Mood generation fallback", error);
    res.json({
      message: DEFAULT_MOOD_MESSAGE,
      fallback: true,
      recommendation: null,
    });
  }
});

const DEFAULT_TRACK = {
  id: "4yugZvBYaoREkJKtbG08Qr",
  title: "Mediterráneo",
  artist: "Joan Manuel Serrat",
  artwork: null,
  url: "https://open.spotify.com/track/4yugZvBYaoREkJKtbG08Qr",
  embedUrl:
    "https://open.spotify.com/embed/track/4yugZvBYaoREkJKtbG08Qr?utm_source=generator&theme=0",
  note: "Mostrando la canción predeterminada debido a un inconveniente al buscar en Spotify.",
};

let spotifyToken = null;
let spotifyTokenExpiresAt = 0;

async function getSpotifyToken() {
  ensureKey(SPOTIFY_CLIENT_ID, "Spotify Client ID");
  ensureKey(SPOTIFY_CLIENT_SECRET, "Spotify Client Secret");

  const now = Date.now();
  if (spotifyToken && now < spotifyTokenExpiresAt) {
    return spotifyToken;
  }

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");

  const credentials = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const { data } = await axios.post(
    "https://accounts.spotify.com/api/token",
    params.toString(),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    }
  );

  spotifyToken = data.access_token;
  spotifyTokenExpiresAt = now + Math.max(0, data.expires_in - 60) * 1000;
  return spotifyToken;
}

function buildSpotifyQuery(query, type) {
  if (!query) return "";
  const trimmed = query.replace(/["“”']/g, "").trim();
  if (!trimmed) return "";
  if (type === "artist") {
    return `artist:${trimmed}`;
  }
  return trimmed;
}

async function searchSpotifyTrack(query, type) {
  try {
    const token = await getSpotifyToken();
    const params = {
      q: buildSpotifyQuery(query, type),
      type: "track",
      limit: 1,
    };

    if (!params.q) {
      return { track: DEFAULT_TRACK };
    }

    const { data } = await axios.get("https://api.spotify.com/v1/search", {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    });

    const item = data?.tracks?.items?.[0];
    if (!item) {
      return { track: DEFAULT_TRACK };
    }

    const artwork = item.album?.images?.[0]?.url || null;
    return {
      track: {
        id: item.id,
        title: item.name,
        artist: item.artists?.map((artist) => artist.name).join(", ") || "",
        artwork,
        url: item.external_urls?.spotify || null,
        embedUrl: `https://open.spotify.com/embed/track/${item.id}?utm_source=generator&theme=0`,
        note: null,
      },
    };
  } catch (error) {
    console.error(
      "Spotify search failed",
      error.response?.data || error.message
    );
    return { track: DEFAULT_TRACK };
  }
}

app.get("/api/music", async (req, res) => {
  try {
    const { query, type } = req.query;
    const result = await searchSpotifyTrack(query, type);
    res.json(result);
  } catch (error) {
    console.error("Spotify handler error", error);
    res.json({ track: DEFAULT_TRACK });
  }
});

app.listen(PORT, () => {
  console.log(`MoodWeather API lista en el puerto ${PORT}`);
});

export { cleanModelOutput };
