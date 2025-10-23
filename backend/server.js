import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;

const SOUNDCLOUD_CLIENT_ID =
  process.env.SOUNDCLOUD_CLIENT_ID || "2t9loNQH90kzJcsFCODdigxfp325aq4z";

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

async function callHuggingFace(model, payload, attempt = 0, maxAttempts = 3) {
  const url = `https://api-inference.huggingface.co/models/${model}`;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });

    const { status, data } = response;
    const preview =
      typeof data === "string"
        ? data.slice(0, 120)
        : JSON.stringify(data).slice(0, 200);
    console.log(`[HF] POST ${url} -> ${status}`, preview);

    if (Array.isArray(data)) {
      const text = data[0]?.generated_text ?? data[0]?.text;
      if (text) {
        return text.trim();
      }
    }

    if (typeof data === "object" && data !== null) {
      if (data.generated_text) {
        return data.generated_text.trim();
      }
      if (data.text) {
        return data.text.trim();
      }
    }

    return DEFAULT_MOOD_MESSAGE;
  } catch (error) {
    const status = error.response?.status;
    const responseData = error.response?.data;
    console.error(
      `[HF] Error ${url} -> ${status ?? "unknown"}`,
      responseData || error.message
    );

    if (status === 503 && attempt + 1 < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return callHuggingFace(model, payload, attempt + 1, maxAttempts);
    }

    if (status === 404) {
      throw new Error("model_not_found");
    }

    throw error;
  }
}

async function generateMood(prompt) {
  ensureKey(HF_TOKEN, "HuggingFace");

  const payload = {
    inputs: prompt,
    parameters: {
      max_new_tokens: 60,
      temperature: 0.85,
      top_p: 0.9,
      return_full_text: false,
    },
    options: {
      wait_for_model: true,
    },
  };

  const models = [
    "microsoft/Phi-3-mini-4k-instruct",
    "mistralai/Mistral-7B-Instruct-v0.2",
  ];

  for (const model of models) {
    try {
      const text = await callHuggingFace(model, payload);
      if (text) {
        return text;
      }
    } catch (error) {
      if (error instanceof Error && error.message === "model_not_found") {
        continue;
      }
      // Otros errores continúan con el siguiente modelo
      continue;
    }
  }

  return DEFAULT_MOOD_MESSAGE;
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
    const mood = await generateMood(prompt);
    res.json({ message: mood || DEFAULT_MOOD_MESSAGE });
  } catch (error) {
    console.error("Mood generation fallback", error);
    res.json({ message: DEFAULT_MOOD_MESSAGE });
  }
});

function normaliseArtwork(url) {
  if (!url) return null;
  return url.replace("-large", "-t500x500");
}

const DEFAULT_TRACK = {
  id: "default-track",
  title: "Lo-Fi Beats",
  artist: "Chillhop Music",
  artwork_url: null,
  permalink_url: "https://soundcloud.com/chillhopdotcom/lofi-beats",
};

function buildFallbackKeywords(weather, mood, city) {
  const base = [weather, mood, city, "chill", "beats"]
    .filter(Boolean)
    .join(" ");

  return base.trim() || "chill instrumental beats";
}

async function generateMusicKeywords({ weather, mood, city }) {
  try {
    ensureKey(HF_TOKEN, "HuggingFace");
  } catch (error) {
    const err = new Error("missing_hf_token");
    err.original = error;
    throw err;
  }

  const climate = weather ? weather.toLowerCase() : "";
  const feeling = mood ? mood.toLowerCase() : "";
  const place = city ? `in ${city}` : "";

  const prompt = `You are an assistant that crafts SoundCloud music search keywords based on weather and mood.
Weather description: ${climate || "unknown"}.
Mood description: ${feeling || "balanced"}.
Location hint: ${place || ""}.
Reply with a single lowercase line of 3 to 6 English keywords suitable for searching relaxing but fitting music on SoundCloud. Separate the keywords with spaces only, no punctuation, lists or explanations.`;

  const payload = {
    inputs: prompt,
    parameters: {
      max_new_tokens: 32,
      temperature: 0.8,
      top_p: 0.9,
      return_full_text: false,
    },
    options: {
      wait_for_model: true,
    },
  };

  try {
    const raw = await callHuggingFace(
      "microsoft/Phi-3-mini-4k-instruct",
      payload
    );

    if (!raw) {
      return buildFallbackKeywords(weather, mood, city);
    }

    const keywords = raw
      .toLowerCase()
      .replace(/[\r\n]+/g, " ")
      .replace(/[,;:.]+/g, " ")
      .replace(/[^a-z0-9#&\-\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6);

    if (!keywords.length) {
      return buildFallbackKeywords(weather, mood, city);
    }

    return keywords.join(" ");
  } catch (error) {
    console.error("Failed to generate music keywords", error.message);
    return buildFallbackKeywords(weather, mood, city);
  }
}

app.get("/api/music", async (req, res) => {
  try {
    ensureKey(SOUNDCLOUD_CLIENT_ID, "SoundCloud");
  } catch (error) {
    return res.json({
      track: {
        ...DEFAULT_TRACK,
        note: "Configura la clave de SoundCloud para obtener recomendaciones personalizadas.",
      },
    });
  }

  const { weather, mood, city } = req.query;

  if (!weather) {
    return res
      .status(400)
      .json({ error: "Indica el tipo de clima para sugerir música." });
  }

  let searchTerms = buildFallbackKeywords(weather, mood, city);

  try {
    searchTerms = await generateMusicKeywords({ weather, mood, city });
  } catch (error) {
    if (error instanceof Error && error.message === "missing_hf_token") {
      console.warn(
        "HuggingFace token missing, falling back to static keywords"
      );
    } else {
      console.error("Keyword generation error", error);
    }
  }

  const params = {
    q: searchTerms,
    client_id: SOUNDCLOUD_CLIENT_ID,
    limit: 20,
    offset: 0,
    filter: "public",
  };

  try {
    const url = "https://api-v2.soundcloud.com/search/tracks";
    const response = await axios.get(url, {
      params,
      timeout: 15000,
    });
    const { status, data } = response;
    const preview = JSON.stringify(data?.collection?.slice(0, 1) ?? []).slice(
      0,
      200
    );
    console.log(`[SoundCloud] GET ${url} -> ${status}`, preview);

    const collection = Array.isArray(data?.collection) ? data.collection : [];
    const playableTracks = collection.filter((item) => {
      if (!item || item.kind !== "track") return false;
      const isPublic = !item.sharing || item.sharing === "public";
      const isStreamable = item.streamable === true;
      const isBlocked = item.policy && item.policy.toLowerCase() === "block";
      return isPublic && isStreamable && !isBlocked;
    });

    if (!playableTracks.length) {
      return res.json({ track: DEFAULT_TRACK });
    }

    const track =
      playableTracks[Math.floor(Math.random() * playableTracks.length)];

    const suggestion = {
      id: track.id,
      title: track.title,
      artist: track.user?.username ?? "Artista desconocido",
      artwork_url: normaliseArtwork(
        track.artwork_url || track.user?.avatar_url
      ),
      permalink_url: track.permalink_url,
    };

    res.json({ track: suggestion });
  } catch (error) {
    const status = error.response?.status;
    console.error(
      `[SoundCloud] Error -> ${status ?? "unknown"}`,
      error.response?.data || error.message
    );
    if (status === 401) {
      return res.json({
        track: {
          ...DEFAULT_TRACK,
          note: "Tu clave de SoundCloud parece inválida. Revisa la configuración.",
        },
      });
    }
    res.json({ track: DEFAULT_TRACK, message: DEFAULT_MOOD_MESSAGE });
  }
});

app.listen(PORT, () => {
  console.log(`MoodWeather API lista en el puerto ${PORT}`);
});
