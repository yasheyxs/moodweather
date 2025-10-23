import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Claves
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

// Verificación de claves
function ensureKey(key, name) {
  if (!key) throw new Error(`Falta la clave de ${name} en .env`);
}

// Endpoint básico
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Clima
app.get("/api/weather", async (req, res) => {
  try {
    ensureKey(OPENWEATHER_KEY, "OpenWeather");
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  const { city, lat, lon } = req.query;
  if (!city && (!lat || !lon))
    return res.status(400).json({ error: "Proporciona ciudad o coordenadas." });

  const params = {
    appid: OPENWEATHER_KEY,
    units: "metric",
    lang: "es",
    ...(city ? { q: city } : { lat, lon }),
  };

  try {
    const { data } = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      { params }
    );
    res.json(data);
  } catch (error) {
    console.error("OpenWeather error:", error.message);
    const status = error.response?.status;
    if (status === 404)
      return res.status(404).json({ error: "Ciudad no encontrada." });
    if (status === 401)
      return res
        .status(500)
        .json({ error: "Clave de OpenWeather inválida o expirada." });
    res.status(500).json({ error: "No se pudo obtener el clima." });
  }
});

// Limpieza de texto IA
function cleanModelOutput(text) {
  if (typeof text !== "string") return "";

  return text
    .replace(
      /(?:<\/?s>|<\|(?:im_[a-z]+|startoftext|endoftext)\|>|\[\/?B?_?INST\]|\[(?:BOS|EOS)\]|#{2,}|```|\bB?OUT\])/gi,
      " "
    )
    .replace(/^[^A-Za-zÀ-ÿ]{2,}/, "")
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
    .replace(/[<>[\]{}]/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?!\s|$)/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

function limitSentences(text, { min = 2, max = 3 } = {}) {
  if (typeof text !== "string") return "";

  const sanitized = text.replace(/\s+/g, " ").trim();
  if (!sanitized) return "";

  const sentences = sanitized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (!sentences.length) return sanitized;

  const desired = Math.min(
    sentences.length,
    Math.max(min, Math.min(max, sentences.length))
  );

  return sentences.slice(0, desired).join(" ");
}

// Detección de recomendación
function extractRecommendation(message) {
  if (typeof message !== "string" || !message.trim()) return null;
  const cleaned = message.replace(/\s+/g, " ").trim();

  const patterns = [
    /escucha\s+\*?["“”']?([^"“”'\*]{3,})["“”'\*]?(?:\s+(?:de|por)\s+([^.,;]+))?/i,
    /["“”']([^"“”']{3,})["“”']\s*(?:de|por)\s+([^.,;]+)/i,
    /escucha(?:r)?\s+a\s+([^.,;]+)/i,
  ];

  for (const regex of patterns) {
    const match = cleaned.match(regex);
    if (match) {
      const song = match[1]?.trim();
      const artist = match[2]?.trim();
      if (song) {
        const query = artist ? `${song} ${artist}` : song;
        return { query, type: "track" };
        return { query, title: song, artist: artist || null, type: "track" };
      }
    }
  }
  return null;
}

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAllWords(text, words) {
  if (!words.length) return false;
  const normalizedText = normalize(text);
  return words.every((word) => normalizedText.includes(word));
}

// Llamada a OpenRouter
async function callOpenRouter(payload, attempt = 0) {
  const url = "https://openrouter.ai/api/v1/chat/completions";
  try {
    const { data } = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${OPENROUTER_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });
    return data?.choices?.[0]?.message?.content?.trim() || "";
  } catch (err) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500));
      return callOpenRouter(payload, attempt + 1);
    }
    console.error("OpenRouter error:", err.message);
    return "";
  }
}

// Generar mensaje poético
async function generateMood(prompt) {
  const payload = {
    model: "mistralai/mistral-7b-instruct",
    messages: [
      {
        role: "system",
        content: `
Eres MoodWeather, una IA poética que transforma el clima en mensajes breves e inspiradores en español.

Tu respuesta SIEMPRE debe incluir:
  1. Una descripción poética del clima y cómo podría influir en el estado de ánimo.  
  2. Una recomendación musical CLARA, mencionando *exactamente* una canción y su artista, en formato:
  "‘Título de la canción’ de [Artista]"  
  3. Nunca inventes artistas inexistentes ni omitas el título de la canción.
  4. Si el clima o contexto no inspira nada específico, elige una canción real reconocida (de Spotify), apropiada al tono general (ej. “Here Comes the Sun” de The Beatles para un día soleado).
  5. Tu respuesta debe sonar natural y humana, con máximo 3 frases.
        `,
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 160,
    temperature: 0.85,
  };

  const raw = await callOpenRouter(payload);
  const cleaned = cleanModelOutput(raw);
  const limited = limitSentences(cleaned);
  return (
    limited ||
    "El clima invita a disfrutar de un momento de calma. 'Mediterráneo' de Joan Manuel Serrat sería un refugio perfecto para hoy."
  );
}

// Config Spotify
let spotifyToken = null;
let spotifyTokenExpiresAt = 0;

async function getSpotifyToken() {
  const now = Date.now();
  if (spotifyToken && now < spotifyTokenExpiresAt) return spotifyToken;

  const params = new URLSearchParams({ grant_type: "client_credentials" });
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
    }
  );

  spotifyToken = data.access_token;
  spotifyTokenExpiresAt = now + (data.expires_in - 60) * 1000;
  return spotifyToken;
}

// Búsqueda en Spotify con fallback por artista
async function searchSpotifyTrack({ query, title, artist }) {
  const token = await getSpotifyToken();

  // Buscar la canción exacta primero
  const { data } = await axios.get("https://api.spotify.com/v1/search", {
    params: { q: query, type: "track", limit: 5, market: "ES" },
    headers: { Authorization: `Bearer ${token}` },
  });

  const tracks = data?.tracks?.items || [];
  if (tracks.length) {
    const queryWords = normalize(query).split(" ").filter(Boolean);
    const titleWords = normalize(title).split(" ").filter(Boolean);
    const artistWords = normalize(artist).split(" ").filter(Boolean);

    const matchByBoth = tracks.find((track) => {
      if (!titleWords.length || !artistWords.length) return false;
      const titleMatch = includesAllWords(track.name, titleWords);
      const artistMatch = track.artists.some((candidate) =>
        includesAllWords(candidate.name, artistWords)
      );
      return titleMatch && artistMatch;
    });

    if (matchByBoth) return matchByBoth;

    const matchByTitle = titleWords.length
      ? tracks.find((track) => includesAllWords(track.name, titleWords))
      : null;
    if (matchByTitle) return matchByTitle;

    const matchByArtist = artistWords.length
      ? tracks.find((track) =>
          track.artists.some((candidate) =>
            includesAllWords(candidate.name, artistWords)
          )
        )
      : null;
    if (matchByArtist) return matchByArtist;
  }

  // Si no se encontró la canción, buscar otra del mismo artista
  if (artist) {
    try {
      const { data: artistData } = await axios.get(
        "https://api.spotify.com/v1/search",
        {
          params: { q: artist, type: "artist", limit: 1, market: "ES" },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const artistId = artistData?.artists?.items?.[0]?.id;
      if (artistId) {
        const { data: topTracks } = await axios.get(
          `https://api.spotify.com/v1/artists/${artistId}/top-tracks`,
          {
            params: { market: "ES" },
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (topTracks?.tracks?.length) {
          // Elegimos la primera canción popular del artista
          return topTracks.tracks[0];
        }
      }
    } catch (err) {
      console.error("Error al buscar canciones del artista:", err.message);
    }
  }

  // Fallback global
  return null;
}

// Endpoint principal de Mood
app.post("/api/mood", async (req, res) => {
  const { weather, description, temperature, feelsLike, location } = req.body;
  if (!weather)
    return res
      .status(400)
      .json({ error: "Debe especificarse el estado del clima." });

  const prompt = `Hoy en ${location || "tu zona"} el clima es ${
    description || weather
  }.
Temperatura ${
    temperature || "desconocida"
  }°C. Genera una frase poética y emocional, con tono humano, 
y si lo consideras apropiado, sugiere una canción o artista musical.`;

  const message = await generateMood(prompt);
  const recommendation = extractRecommendation(message);

  try {
    let track = null;
    if (recommendation) {
      const result = await searchSpotifyTrack(recommendation);
      if (result) {
        track = {
          id: result.id,
          title: result.name,
          artist: result.artists.map((a) => a.name).join(", "),
          artwork: result.album?.images?.[0]?.url,
          embedUrl: `https://open.spotify.com/embed/track/${result.id}?utm_source=generator&theme=0`,
          url: result.external_urls.spotify,
        };
      }
    }

    res.json({
      message,
      recommendation,
      track: track || {
        id: "4yugZvBYaoREkJKtbG08Qr",
        title: "Mediterráneo",
        artist: "Joan Manuel Serrat",
        artwork:
          "https://i.scdn.co/image/ab67616d00001e020f66ee3bda2c77d8e1a3b5c9",

        embedUrl:
          "https://open.spotify.com/embed/track/4yugZvBYaoREkJKtbG08Qr?utm_source=generator&theme=0",
        url: "https://open.spotify.com/track/4yugZvBYaoREkJKtbG08Qr",
      },
    });
  } catch (err) {
    console.error("Error general:", err.message);
    res.json({
      message,
      recommendation: null,
      track: {
        id: "4yugZvBYaoREkJKtbG08Qr",
        title: "Mediterráneo",
        artist: "Joan Manuel Serrat",
        artwork:
          "https://i.scdn.co/image/ab67616d00001e020f66ee3bda2c77d8e1a3b5c9",

        embedUrl:
          "https://open.spotify.com/embed/track/4yugZvBYaoREkJKtbG08Qr?utm_source=generator&theme=0",
        url: "https://open.spotify.com/track/4yugZvBYaoREkJKtbG08Qr",
      },
    });
  }
});

// Inicialización
app.listen(PORT, () => console.log(`✅ MoodWeather API en puerto ${PORT}`));
