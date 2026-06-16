# 🤖 JARVIS

Asistente y agregador inteligente de noticias con estética **Iron Man / Stark HUD** (cian · azul · negro). Incluye un **chat con JARVIS** que te saluda al entrar y responde sobre las noticias del día. Reúne automáticamente las noticias más relevantes del día anterior sobre **Puerto Rico, energía, agua, economía, clima, tecnología/IA, negocios y deportes**, las rankea por importancia y te las presenta en un resumen de ~5 minutos de lectura.

> Hecho para correr **sin configurar nada**: trae noticias reales vía RSS de Google News (localizado a PR, en español) y feeds directos (NYT, The Verge, NOAA, OilPrice). No necesita API key.

---

## 🚀 Cómo arrancarlo (lo más rápido)

**Opción A — doble clic (Windows):**
1. Doble clic en **`start.bat`**.
2. Se abre el navegador solo en `http://localhost:3000`.
3. Para apagarlo: cierra la ventana negra.

**Opción B — terminal:**
```bash
cd jarvis-news
npm install      # solo la primera vez
npm start        # arranca en http://localhost:3000
```
Para desarrollo con auto-recarga: `npm run dev`.

**Requisito:** [Node.js](https://nodejs.org) 18 o superior (probado en Node 24).

---

## ✨ Qué incluye

### Pantallas
| Pantalla | Qué hace |
|---|---|
| **Splash** | Círculo Jarvis animado (anillos giratorios + glow pulsante) y barra de progreso. |
| **Inicio (Command Center)** | Estilo HUD Iron Man: **figura grande de JARVIS al centro** (casco + reactor + anillos giratorios + reloj en vivo), **noticias destacadas a la izquierda**, y un **dock circular abajo** con iconos HUD que navegan a cada sección. Tocar a JARVIS abre el chat. |
| **JARVIS (chat)** | Conversas con JARVIS; te saluda al entrar (escrito tipo máquina) y **te llama "FER"**. Responde con noticias reales. |
| **Todas** | Las 50 más relevantes con **buscador**, **filtros por categoría** y orden (importante/reciente), vista grid o lista. |
| **Detalle** | Al hacer clic en una noticia: **resumen** + botón grande "Entrar al enlace y leer la noticia completa ↗" + relacionadas. |
| **Favoritos** | Noticias que guardaste (❤️), persistidas en el navegador. |
| **Historial** | Calendario de 30 días: elige una fecha y ve las noticias archivadas. |
| **Ajustes** | Toggles de categorías, tema oscuro/claro, hora de actualización, notificaciones, idioma, borrar datos. |

### Inteligencia del agregador
- **Ranking por importancia (1–10)**: combina peso base de la categoría + palabras clave críticas (huracán, apagón, LUMA, AAA, tarifa…) + recencia.
- **Deduplicación**: elimina noticias repetidas por título/firma.
- **Sentimiento** básico (positivo / neutral / negativo) por léxico.
- **Cache en memoria** (30 min) para no saturar las fuentes.
- **Fallback**: si no hay internet, usa `data/sample-news.json` para que la app nunca se vea vacía.

### Detalles de UX
- Diseño 100% responsive (móvil / tablet / escritorio).
- Tema oscuro estilo Jarvis + tema claro opcional.
- Favoritos, historial y preferencias guardados en `localStorage`.
- Respeta `prefers-reduced-motion`.

---

## 🗂️ Estructura del proyecto

```
jarvis-news/
├─ server.js              # Backend Express + API REST + sirve el frontend
├─ start.bat              # Lanzador Windows (doble clic)
├─ package.json
├─ .env.example           # Variables opcionales (NewsAPI, Firebase)
├─ config/
│  └─ sources.js          # ⭐ CATEGORÍAS, SUBTEMAS y FUENTES (edita aquí)
├─ lib/
│  └─ aggregator.js       # Fetch RSS, normalización, dedupe, ranking, cache
├─ data/
│  └─ sample-news.json    # Datos de respaldo (sin internet)
└─ public/                # Frontend (sin build step)
   ├─ index.html
   ├─ css/jarvis.css       # Paleta + animaciones Jarvis
   └─ js/
      ├─ store.js          # localStorage (favoritos/historial/ajustes)
      ├─ api.js            # Cliente de la API
      ├─ ui.js             # Render de tarjetas y formato
      └─ app.js            # Router + lógica de pantallas
```

---

## 🔌 API REST

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servicio + info del cache |
| GET | `/api/jarvis/greeting` | Saludo de bienvenida del asistente |
| GET | `/api/jarvis?q=...` | Pregúntale a JARVIS (responde con noticias) |
| GET | `/api/news/yesterday` | **Default del dashboard** — noticias de ayer |
| GET | `/api/news/today` | Noticias de hoy |
| GET | `/api/news/all` | Top 50 (hoy + ayer) |
| GET | `/api/news/category/:id` | Por categoría (`energia`, `agua`, `clima`…) |
| GET | `/api/news/search/:query` | Búsqueda por palabra clave |
| GET | `/api/news/date/:YYYY-MM-DD` | Por fecha específica |
| GET | `/api/news/:id` | Un artículo + relacionadas |
| GET | `/api/settings/categories` | Categorías y subtemas disponibles |

Añade `?refresh=1` a `today`/`yesterday`/`all` para forzar recarga desde las fuentes.

---

## 🛠️ Cómo adaptarlo

### 1. Cambiar/añadir temas y fuentes → `config/sources.js`
Todo el "qué busca" vive en un solo archivo. Cada categoría tiene:

```js
{
  id: 'energia', label: 'Energia', icon: '⚡',
  importance: 10, color: '#FFB300', region: ES,
  queries: [                      // cada string = 1 búsqueda en Google News
    'LUMA Energy Puerto Rico',
    'apagones Puerto Rico',
  ],
  feeds: [                        // RSS directos opcionales
    'https://oilprice.com/rss/main',
  ],
  max: 8,                         // cuántas conservar tras el ranking
}
```

- **Añadir un subtema:** agrega un string a `queries`. (Se convierte solo en un feed de Google News localizado.)
- **Añadir un medio con RSS propio:** agrega su URL a `feeds`.
- **Nueva categoría:** copia un bloque, cambia `id`/`label`/`icon`/`color`. Aparece sola en la app (Home, filtros y Ajustes).
- **Cambiar idioma/región:** usa `ES` (español PR/Latam) o `EN` (inglés global), o crea tu propia región con `{ hl, gl, ceid }`.

### 2. Ajustar el ranking
En `config/sources.js`, edita `PRIORITY_KEYWORDS` para subir/bajar el peso de ciertos temas:
```js
{ words: ['huracan', 'tormenta', 'alerta'], boost: 4 },
```

### 3. Cambiar colores / estética
Edita las variables CSS al inicio de `public/css/jarvis.css`. El tema actual es el **HUD azul cian de Iron Man**:
```css
:root { --primary:#00CFFF; --primary-2:#1E90FF; --bg:#02060d; --info:#00A8FF; ... }
```

### 3b. Personalizar a JARVIS (el chat)
El asistente vive en `lib/jarvis.js` (motor por intenciones, sin API key):
- **Saludo de bienvenida:** función `jarvisGreeting()`.
- **Respuestas / intenciones:** función `jarvisRespond()` — agrega palabras clave en `CAT_KEYWORDS` o nuevos bloques `if`.
- **Sugerencias rápidas:** `defaultSuggestions()`.
- **¿IA real (Claude/GPT)?** El formato de respuesta es `{ reply, articles, suggestions }`. Para conectar un LLM, en `server.js` (endpoint `/api/jarvis`) enruta la consulta a la API cuando exista una key, conservando ese formato. El frontend no necesita cambios.

### 4. (Opcional) Añadir NewsAPI
Copia `.env.example` a `.env`, consigue una key gratis en [newsapi.org](https://newsapi.org) y añade `NEWSAPI_KEY=...`. (El esqueleto del `.env` ya está; integrar la llamada es un feed más en `lib/aggregator.js`.)

---

## ☁️ Migrar favoritos/usuarios a Firebase (opcional)

Hoy los favoritos, historial y preferencias se guardan en `localStorage` (por navegador). Para sincronizarlos en la nube y tener login:

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com) y activa **Firestore** + **Authentication**.
2. Frontend: añade el SDK web de Firebase en `index.html` e implementa login (Email/Google/anónimo).
3. Reemplaza las funciones de `public/js/store.js` para que lean/escriban en las colecciones:
   - `users/{uid}` → preferencias
   - `favorites/{uid}/articles/{articleId}`
   - `reading_history/{uid}/articles/{articleId}`
4. (Opcional) Backend: usa `firebase-admin` con las credenciales de `.env` para guardar también los `articles/` agregados y servir el historial de 30 días desde Firestore en vez del cache en memoria.

> El modelo de datos sugerido (campos de `articles`, `users`, `favorites`, `reading_history`) está pensado para mapear 1:1 con lo que ya produce el agregador.

---

## 🚢 Despliegue

- **Todo junto (recomendado):** este repo es un servidor Node que sirve el frontend, así que sube *tal cual* a **Railway**, **Render** o **Fly.io**. Configura `PORT` por variable de entorno (ya se respeta).
- **Frontend en Vercel/Netlify + backend aparte:** apunta `public/js/api.js` (`base`) a la URL del backend.
- **HTTPS/SSL:** automático en los hosts anteriores.

---

## 🧪 Estado de pruebas

Probado localmente con datos reales: splash, navegación entre las 7 pantallas, detalle + relacionadas, favoritos persistentes, calendario de historial, buscador/filtros y responsive móvil. Sin errores de consola.

---

## 📝 Notas y decisiones de diseño

- **Por qué vanilla JS y no React:** para que corra con un solo `node server.js`, sin paso de build ni dependencias frágiles en Windows. El código está modularizado (store/api/ui/app) y es fácil de portar a React si lo necesitas; la estructura de componentes del spec se respeta conceptualmente.
- **Por qué Google News RSS:** es gratis, sin API key, en español y localizable a Puerto Rico por subtema — ideal para LUMA, AAA, NEPR, etc.
- **"Noticias de ayer":** si los feeds aún no tienen artículos fechados ayer, el dashboard cae automáticamente a las más recientes para no quedar vacío.

---

Hecho con ⚡ estilo Stark. *"Sometimes you gotta run before you can walk."*
