const path = require("path");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const http = axios.create({
  timeout: 15000,
  headers: { "User-Agent": "MoodWeather/1.0" },
});

const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;

const WEATHER_THEMES = {
  Clear: {
    keywords: ["sun", "feel good", "upbeat"],
  },
  Clouds: {
    keywords: ["ambient", "dream", "cloudy"],
  },
  Rain: {
    keywords: ["rain", "lofi", "calm"],
  },
  Snow: {
    keywords: ["snow", "piano", "winter"],
  },
  Thunderstorm: {
    keywords: ["storm", "electronic", "intense"],
  },
  Drizzle: {
    keywords: ["drizzle", "chill", "soft"],
  },
  Mist: {
    keywords: ["mist", "ambient", "haze"],
  },
};

const FALLBACK_TRACKS = {
  Clear: {
    title: "Golden Hour",
    artist: "Lumina",
    url: "https://soundcloud.com/illuminatedsounds/golden-hour",
    artwork:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
    source: "fallback",
  },
  Clouds: {
    title: "Silver Lining",
    artist: "Nimbus Collective",
    url: "https://soundcloud.com/lofi-girl/silver-lining",
    artwork:
      "https://images.unsplash.com/photo-1521292270410-a8c8e0e1ff53?auto=format&fit=crop&w=600&q=80",
    source: "fallback",
  },
  Rain: {
    title: "Night Drive",
    artist: "Rain City",
    url: "https://soundcloud.com/chillhopdotcom/rainy-night-drive",
    artwork:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=600&q=80",
    source: "fallback",
  },
  Snow: {
    title: "Winter Lights",
    artist: "Polar Echoes",
    url: "https://soundcloud.com/chillhopdotcom/winter-lights",
    artwork:
      "https://images.unsplash.com/photo-1517832207067-4db24a2ae47c?auto=format&fit=crop&w=600&q=80",
    source: "fallback",
  },
  Thunderstorm: {
    title: "Electric Veins",
    artist: "Tempest",
    url: "https://soundcloud.com/monstercat/bossfight-epic",
    artwork:
      "https://images.unsplash.com/photo-1500674425229-f692875b0ab7?auto=format&fit=crop&w=600&q=80",
    source: "fallback",
  },
  Drizzle: {
    title: "Soft Rain",
    artist: "Mist Field",
    url: "https://soundcloud.com/chillhopdotcom/soft-rain",
    artwork:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=80",
    source: "fallback",
  },
  Mist: {
    title: "Silent Morning",
    artist: "Horizon",
    url: "https://soundcloud.com/ambientmusique/silent-morning",
    artwork:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=600&q=80",
    source: "fallback",
  },
};

const FALLBACK_QUOTES = {
  Clear: {
    text: "La luz es como el agua: cuando se abre la puerta, inunda todo el corazón.",
    author: "Gabriel García Márquez",
    source: "fallback",
  },
  Clouds: {
    text: "Entre nubes aprendemos a distinguir los matices de la esperanza.",
    author: "Alejandra Pizarnik",
    source: "fallback",
  },
  Rain: {
    text: "Llueve, y yo siento que la lluvia es otra forma de volver a empezar.",
    author: "Julio Cortázar",
    source: "fallback",
  },
  Snow: {
    text: "La nieve cubre el ruido del mundo con un silencio lleno de posibilidades.",
    author: "Idea Vilariño",
    source: "fallback",
  },
  Thunderstorm: {
    text: "Hasta la tormenta más intensa oculta el pulso de una nueva calma.",
    author: "Octavio Paz",
    source: "fallback",
  },
  Drizzle: {
    text: "Hay lloviznas que parecen susurros: apenas tocan, pero transforman todo.",
    author: "Alfonsina Storni",
    source: "fallback",
  },
  Mist: {
    text: "En la neblina uno no se pierde, solo aprende a avanzar de a poco.",
    author: "Mario Benedetti",
    source: "fallback",
  },
};

const resolveMood = (main) => {
  if (!main) return "Clear";
  if (WEATHER_THEMES[main]) return main;

  const aliases = {
    Haze: "Mist",
    Fog: "Mist",
    Smoke: "Mist",
    Dust: "Mist",
    Sand: "Mist",
    Ash: "Mist",
    Squall: "Thunderstorm",
    Tornado: "Thunderstorm",
  };

  return aliases[main] || "Clear";
};

app.get("/api/weather", async (req, res) => {
  if (!OPENWEATHER_KEY) {
    return res.status(500).json({
      error: "OPENWEATHER_API_KEY environment variable is required",
    });
  }

  const { city, lat, lon } = req.query;

  if (!city && (!lat || !lon)) {
    return res.status(400).json({
      error:
        "You must provide either a city name or both latitude and longitude",
    });
  }

  const params = {
    appid: OPENWEATHER_KEY,
    units: "metric",
  };

  if (lat && lon) {
    params.lat = lat;
    params.lon = lon;
  } else {
    params.q = city;
  }

  try {
    const response = await http.get(
      "https://api.openweathermap.org/data/2.5/weather",
      { params }
    );

    if (response.status !== 200 || !response.data) {
      return res
        .status(502)
        .json({ error: "Unexpected response from OpenWeather" });
    }

    return res.json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data?.message || "Unable to fetch weather data",
      });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({ error: "Weather request timed out" });
    }

    return res.status(500).json({ error: "Weather service is unavailable" });
  }
});

app.get("/api/geocode", async (req, res) => {
  if (!OPENWEATHER_KEY) {
    return res.status(500).json({
      error: "OPENWEATHER_API_KEY environment variable is required",
    });
  }

  const { q } = req.query;
  const query = (q || "").trim();

  if (!query) {
    return res.json([]);
  }

  try {
    const response = await http.get(
      "https://api.openweathermap.org/geo/1.0/direct",
      {
        params: {
          q: query,
          limit: 5,
          appid: OPENWEATHER_KEY,
        },
      }
    );

    if (response.status !== 200 || !Array.isArray(response.data)) {
      return res
        .status(502)
        .json({ error: "Unexpected response from OpenWeather" });
    }

    const sanitized = response.data.map((item) => ({
      name: item.name,
      state: item.state || null,
      country: item.country,
      lat: item.lat,
      lon: item.lon,
    }));

    return res.json(sanitized);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data?.message || "Unable to fetch suggestions",
      });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({ error: "Geocoding request timed out" });
    }

    return res.status(500).json({ error: "Geocoding service is unavailable" });
  }
});

app.get("/api/music", async (req, res) => {
  const mood = resolveMood(req.query.mood);
  const clientId = process.env.SOUNDCLOUD_CLIENT_ID;

  if (!clientId) {
    return res.json({
      mood,
      track: FALLBACK_TRACKS[mood] || FALLBACK_TRACKS.Clear,
    });
  }

  const keywords = WEATHER_THEMES[mood]?.keywords || ["chill", mood];

  try {
    const response = await http.get(
      "https://api-v2.soundcloud.com/search/tracks",
      {
        params: {
          q: keywords.join(" "),
          client_id: clientId,
          limit: 12,
          linked_partitioning: 1,
        },
      }
    );

    if (response.status !== 200 || !response.data?.collection) {
      throw new Error("Invalid SoundCloud response");
    }

    const track =
      response.data.collection.find((item) => item.streamable) ||
      response.data.collection[0];

    if (!track) {
      throw new Error("No tracks found");
    }

    return res.json({
      mood,
      track: {
        title: track.title,
        artist: track.user?.username,
        url: track.permalink_url,
        artwork: track.artwork_url || track.user?.avatar_url || null,
        source: "soundcloud",
      },
    });
  } catch (error) {
    if (error.response && error.response.status === 401) {
      return res.json({
        mood,
        track: FALLBACK_TRACKS[mood] || FALLBACK_TRACKS.Clear,
      });
    }

    return res.status(200).json({
      mood,
      track: FALLBACK_TRACKS[mood] || FALLBACK_TRACKS.Clear,
    });
  }
});

app.get("/api/ai-quote", async (req, res) => {
  const mood = resolveMood(req.query.mood);
  const token = process.env.HUGGINGFACE_API_TOKEN;

  if (!token) {
    return res.json({
      mood,
      ...FALLBACK_QUOTES[mood],
    });
  }

  const prompt = `Genera una frase breve y poética para alguien que siente el clima ${mood}.`;

  try {
    const response = await http.post(
      "https://api-inference.huggingface.co/models/gpt2",
      { inputs: prompt, parameters: { max_new_tokens: 60, temperature: 0.8 } },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status !== 200 || !response.data) {
      throw new Error("Invalid HuggingFace response");
    }

    const generated = Array.isArray(response.data)
      ? response.data[0]?.generated_text
      : response.data.generated_text;

    if (!generated) {
      throw new Error("Empty HuggingFace response");
    }

    const sanitized = generated.replace(prompt, "").replace(/"/g, '"').trim();

    const sentence = sanitized.split(/\n+/)[0]?.trim() || sanitized;

    if (!sentence) {
      throw new Error("Unable to parse HuggingFace sentence");
    }

    return res.json({
      mood,
      text: sentence,
      author: "HuggingFace GPT-2",
      source: "huggingface",
    });
  } catch (error) {
    if (error.response && error.response.status === 503) {
      return res.status(202).json({
        mood,
        ...FALLBACK_QUOTES[mood],
      });
    }

    return res.json({
      mood,
      ...FALLBACK_QUOTES[mood],
    });
  }
});

if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "build");
  app.use(express.static(buildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`MoodWeather server listening on port ${PORT}`);
  });
}

module.exports = app;
