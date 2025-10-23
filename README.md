# 🎧 MoodWeather — Clima, música e inspiración en tiempo real

**MoodWeather** es una experiencia web interactiva que convierte el clima en **inspiración emocional y musical**.
Combina datos meteorológicos, generación de textos con IA y recomendaciones musicales inteligentes, ofreciendo un acompañamiento personalizado según el estado del tiempo.

> Una fusión entre tecnología, arte y emoción — desarrollada con enfoque full-stack, buenas prácticas y diseño centrado en el usuario.

![2025-10-2316-56-39online-video-cutter com-ezgif com-video-to-gif-converter](https://github.com/user-attachments/assets/651ec104-3ce3-43d4-b152-bc0055a84a19)

---

- **Producto completo y escalable:** SPA en React con backend Express, arquitectura clara y lógica desacoplada.

- **Integración real de APIs:** Orquestación entre OpenWeather, OpenRouter (IA) y Spotify Web API.

- **UX cuidada:** Autocompletado geográfico, animaciones suaves, estados de carga accesibles y manejo robusto de errores.

- **Código mantenible:** Módulos reutilizables, utilities bien documentadas y separación de responsabilidades por capas.

- **Entrega profesional:** Documentación, variables de entorno seguras y estructura lista para despliegue.

---

## 🧱 Arquitectura general

```
frontend/ → SPA React (Vite)
backend/  → API Node.js + Express (BFF – Backend For Frontend)
```

- El **frontend** gestiona el theming dinámico basado en el clima, consume endpoints propios (`/api/...`) y organiza la experiencia en `WeatherDisplay`.

- El **backend** centraliza la lógica de negocio: unifica datos del clima, genera textos motivacionales con IA y obtiene canciones relevantes desde Spotify.

- Las claves y tokens se gestionan mediante `.env` para asegurar despliegues seguros y replicables.

---

## 🚀 Funcionalidades destacadas

- 🔍 **Búsqueda de ciudades** con autocompletado y navegación por teclado o mouse.
- ☁️ **Visualización meteorológica** con datos clave (temperatura, sensación térmica, humedad y viento).
- 💬 **Frases emocionales generadas por IA**, en español, con limpieza y formato de texto profesional.
- 🎵 **Recomendaciones musicales dinámicas** con portada, artista y enlaces directos a Spotify.
- 🧩 **Fallback inteligente:** si una API externa falla, el sistema sugiere alternativas coherentes.
- ⚠️ **Gestión avanzada de errores:** mensajes amigables y estados de carga granulares para mantener la experiencia fluida.

---

## 🧪 Buenas prácticas implementadas

- ✅ **Axios preconfigurado** con timeouts y cancelaciones para evitar condiciones de carrera.
- 🎨 **Normalización semántica del clima** (`THEME_ALIASES`) para simplificar el diseño temático.
- 🧹 **Limpieza de respuestas IA** (`cleanModelOutput`) que garantiza textos listos para producción.
- 🎯 **Búsqueda tolerante en Spotify**, capaz de hallar coincidencias aproximadas y sugerir del mismo artista.
- 🔐 **Gestión de variables sensibles** mediante `.env` y `dotenv` para despliegues cloud.

---

## 🛠️ Stack tecnológico

**Frontend:**
React 18 · Vite · CSS Modules · Hooks avanzados (memo, refs, callbacks) · Diseño responsive · Accesibilidad

**Backend:**
Node.js 20 · Express · Axios · Dotenv · Integración de APIs externas (OpenWeather, OpenRouter, Spotify)

**Servicios:**
OpenWeather (clima) · OpenRouter (IA generativa) · Spotify Web API (música)

---

## ▶️ Ejecución local

1. Clonar el repositorio.
2. Crear el archivo `.env` en `backend/` con tus claves:

   ```bash
   OPENWEATHER_KEY=tu_api_key
   OPENROUTER_API_KEY=tu_token
   SPOTIFY_CLIENT_ID=tu_client_id
   SPOTIFY_CLIENT_SECRET=tu_client_secret
   ```

3. Instalar y correr el backend:

   ```bash
   cd backend
   npm install
   npm start
   ```

4. En otra terminal, iniciar el frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. Abrir [http://localhost:5173](http://localhost:5173) y disfrutar **MoodWeather** 🌤️

> 💡 Durante el desarrollo, el proxy `/api` apunta a `http://localhost:5000` según configuración en `vite.config.js`.

---

## 💬 En resumen

**MoodWeather** demuestra cómo combinar:

- Diseño moderno e intuitivo,
- Datos en tiempo real,
- Contenido generado por IA,
- y APIs externas en un ecosistema full-stack profesional.

Es un proyecto ideal para mostrar **pensamiento de producto, dominio técnico y atención al detalle** — atributos clave en un desarrollador/a listo/a para entornos de producción.
