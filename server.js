/**
 * server.js
 * ------------------------------------------------------------------
 * JARVIS NEWS - Backend Express.
 * Sirve la API REST de noticias + los archivos estaticos del frontend.
 *
 * Endpoints (segun el spec):
 *   GET  /api/health
 *   GET  /api/news/today
 *   GET  /api/news/yesterday            (DEFAULT del dashboard)
 *   GET  /api/news/all                  (todas, hoy+ayer, max 50)
 *   GET  /api/news/category/:category
 *   GET  /api/news/search/:query
 *   GET  /api/news/date/:date           (YYYY-MM-DD)
 *   GET  /api/news/:id                  (un articulo)
 *   GET  /api/settings/categories       (categorias disponibles)
 *
 * Favoritos/preferencias viven en localStorage del cliente (ver public/js/store.js).
 * Para persistir en servidor/Firebase, ver README -> "Migrar a Firebase".
 * ------------------------------------------------------------------
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { getArticles, getCacheInfo } from './lib/aggregator.js';
import { CATEGORIES } from './config/sources.js';
import { jarvisRespond, jarvisGreeting } from './lib/jarvis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- Helpers de fecha -------------------------------------------------------
function ymd(date) {
  return new Date(date).toISOString().slice(0, 10);
}
function isSameDay(iso, target) {
  return ymd(iso) === target;
}

// Carga articulos reales; si no hay (sin red), usa el sample como fallback.
async function loadArticles(opts) {
  let articles = await getArticles(opts);
  if (!articles || !articles.length) {
    try {
      const raw = await readFile(path.join(__dirname, 'data', 'sample-news.json'), 'utf8');
      articles = JSON.parse(raw);
    } catch {
      articles = [];
    }
  }
  return articles;
}

// ---- API --------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'jarvis-news', cache: getCacheInfo(), time: new Date().toISOString() });
});

app.get('/api/settings/categories', (req, res) => {
  res.json(
    CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
      color: c.color,
      importance: c.importance,
      subtopics: c.queries,
    }))
  );
});

// ---- JARVIS (chat conversacional) ----
app.get('/api/jarvis/greeting', async (req, res) => {
  const articles = await loadArticles({});
  res.json(jarvisGreeting(articles));
});

app.get('/api/jarvis', async (req, res) => {
  const articles = await loadArticles({});
  res.json(jarvisRespond(req.query.q || '', articles));
});

app.get('/api/news/today', async (req, res) => {
  const articles = await loadArticles({ force: req.query.refresh === '1' });
  const today = ymd(new Date());
  res.json(articles.filter((a) => isSameDay(a.publishedAt, today)));
});

app.get('/api/news/yesterday', async (req, res) => {
  const articles = await loadArticles({ force: req.query.refresh === '1' });
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = ymd(y);
  let list = articles.filter((a) => isSameDay(a.publishedAt, yesterday));
  // Si ayer no trajo nada (feeds muy frescos), cae a las mas recientes.
  if (!list.length) list = articles.slice(0, 30);
  res.json(list);
});

app.get('/api/news/all', async (req, res) => {
  const articles = await loadArticles({ force: req.query.refresh === '1' });
  res.json(articles.slice(0, 50));
});

app.get('/api/news/category/:category', async (req, res) => {
  const articles = await loadArticles({});
  res.json(articles.filter((a) => a.category === req.params.category));
});

app.get('/api/news/search/:query', async (req, res) => {
  const q = decodeURIComponent(req.params.query || '').toLowerCase().trim();
  if (!q) return res.json([]);
  const articles = await loadArticles({});
  res.json(
    articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.categoryLabel.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q)
    )
  );
});

app.get('/api/news/date/:date', async (req, res) => {
  const date = req.params.date; // YYYY-MM-DD
  const articles = await loadArticles({});
  res.json(articles.filter((a) => isSameDay(a.publishedAt, date)));
});

// Debe ir despues de las rutas especificas para no capturarlas.
app.get('/api/news/:id', async (req, res) => {
  const articles = await loadArticles({});
  const article = articles.find((a) => a.id === req.params.id);
  if (!article) return res.status(404).json({ error: 'not_found' });
  const related = articles
    .filter((a) => a.category === article.category && a.id !== article.id)
    .slice(0, 4);
  res.json({ ...article, related });
});

// SPA fallback: cualquier otra ruta sirve el index.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🤖  JARVIS NEWS en linea`);
  console.log(`  →  http://localhost:${PORT}\n`);
  // Calienta el cache al arrancar (no bloquea el arranque).
  getArticles({ force: true })
    .then((a) => console.log(`  ✓  Cache inicial: ${a.length} noticias\n`))
    .catch(() => console.log(`  !  No se pudo precargar (se usara fallback)\n`));
});
