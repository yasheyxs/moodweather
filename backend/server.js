const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;
const HF_TOKEN = process.env.HF_TOKEN;
const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;

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

async function generateMood(prompt, retries = 2) {
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

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const { data } = await axios.post(
        "https://api-inference.huggingface.co/models/gpt2",
        payload,
        {
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      );

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

      return "El clima invita a disfrutar de un momento de calma.";
    } catch (error) {
      const status = error.response?.status;
      if (status === 503 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        continue;
      }
      console.error("HuggingFace error", error.message);
      throw new Error("No pudimos generar una frase emocional.");
    }
  }

  return "El clima invita a disfrutar de un momento de calma.";
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
    res.json({ message: mood });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function normaliseArtwork(url) {
  if (!url) return null;
  return url.replace("-large", "-t500x500");
}

app.get("/api/music", async (req, res) => {
  try {
    ensureKey(SOUNDCLOUD_CLIENT_ID, "SoundCloud");
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  const { weather, mood, city } = req.query;

  if (!weather) {
    return res
      .status(400)
      .json({ error: "Indica el tipo de clima para sugerir música." });
  }

  const searchTerms = [weather, mood, city, "chill", "ambient"]
    .filter(Boolean)
    .join(" ");

  const params = {
    q: searchTerms,
    client_id: SOUNDCLOUD_CLIENT_ID,
    limit: 8,
    offset: 0,
  };

  try {
    const { data } = await axios.get(
      "https://api-v2.soundcloud.com/search/tracks",
      {
        params,
      }
    );

    const track = data?.collection?.find((item) => item?.kind === "track");

    if (!track) {
      return res.json({ track: null });
    }

    const suggestion = {
      id: track.id,
      title: track.title,
      artist: track.user?.username ?? "Artista desconocido",
      artworkUrl: normaliseArtwork(track.artwork_url || track.user?.avatar_url),
      permalinkUrl: track.permalink_url,
    };

    res.json({ track: suggestion });
  } catch (error) {
    const status = error.response?.status || 500;
    if (status === 401) {
      return res.status(500).json({
        error: "La clave de SoundCloud no es válida. Revisa tu configuración.",
      });
    }
    console.error("SoundCloud error", error.message);
    res.status(500).json({ error: "No pudimos obtener una canción adecuada." });
  }
});

app.listen(PORT, () => {
  console.log(`MoodWeather API lista en el puerto ${PORT}`);
});
