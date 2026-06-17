/**
 * lib/aggregator.js
 * ------------------------------------------------------------------
 * Obtiene, normaliza, deduplica y rankea noticias de todas las fuentes.
 * Mantiene un cache en memoria con TTL para no martillar las fuentes.
 * ------------------------------------------------------------------
 */
import Parser from 'rss-parser';
import crypto from 'node:crypto';
import { CATEGORIES, PRIORITY_KEYWORDS, googleNewsRss } from '../config/sources.js';

const parser = new Parser({
  timeout: 12000,
  headers: { 'User-Agent': 'JarvisNews/1.0 (+https://localhost)' },
});

// ---- Cache en memoria -------------------------------------------------------
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos
let cache = { articles: [], fetchedAt: 0, fetching: null };

// ---- Utilidades -------------------------------------------------------------
function hashId(str) {
  return crypto.createHash('sha1').update(str).digest('hex').slice(0, 16);
}

function stripHtml(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(text, words = 60) {
  const w = stripHtml(text).split(' ');
  if (w.length <= words) return w.join(' ');
  return w.slice(0, words).join(' ') + '…';
}

// Google News mete el medio dentro del titulo o de <source>. Lo extraemos.
function extractSource(item, fallback) {
  // Si el fallback NO es "Google News", úsalo (es un feed directo con nombre explícito).
  if (fallback && fallback !== 'Google News') return fallback;
  // Para Google News, extrae del source/creator/title.
  if (item.source && typeof item.source === 'object' && item.source._)
    return item.source._;
  if (item.creator) return item.creator;
  // Titulos de Google News suelen venir como "Titular - Medio"
  if (item.title && item.title.includes(' - ')) {
    const parts = item.title.split(' - ');
    return parts[parts.length - 1].trim();
  }
  return fallback || 'Unknown Source';
}

function cleanTitle(title = '') {
  // Quita el " - Medio" final que agrega Google News.
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    if (parts.length > 1 && parts[parts.length - 1].length < 40) {
      parts.pop();
      return parts.join(' - ').trim();
    }
  }
  return title.trim();
}

function findImage(item) {
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url)
    return item['media:content'].$.url;
  const html = item['content:encoded'] || item.content || item.summary || '';
  const m = html.match(/<img[^>]+src="([^"]+)"/i);
  return m ? m[1] : null;
}

// Puntua importancia segun keywords + recencia + base de categoria.
function scoreImportance(article, baseImportance) {
  let score = baseImportance;
  const hay = (article.title + ' ' + article.description).toLowerCase();
  for (const rule of PRIORITY_KEYWORDS) {
    if (rule.words.some((w) => hay.includes(w))) score += rule.boost;
  }
  // Recencia: noticias de las ultimas 24h pesan mas.
  const ageH = (Date.now() - new Date(article.publishedAt).getTime()) / 3.6e6;
  if (ageH < 24) score += 2;
  else if (ageH < 48) score += 1;
  return Math.max(1, Math.min(10, Math.round(score)));
}

// Sentimiento muy simple por lexico (opcional, informativo).
function sentiment(text) {
  const t = text.toLowerCase();
  const neg = ['apagon', 'corte', 'crisis', 'aumento', 'muerte', 'sequia', 'huracan', 'emergencia', 'caida', 'pierde', 'rechaza'];
  const pos = ['acuerdo', 'inversion', 'mejora', 'crece', 'logra', 'aprueba', 'record', 'nuevo proyecto', 'beneficio'];
  let s = 0;
  neg.forEach((w) => t.includes(w) && (s -= 1));
  pos.forEach((w) => t.includes(w) && (s += 1));
  return s > 0 ? 'positive' : s < 0 ? 'negative' : 'neutral';
}

// Normaliza un item RSS a la forma de articulo de la app.
function normalize(item, cat, fallbackSource) {
  const title = cleanTitle(item.title || '');
  const link = item.link || item.guid || '';
  const description = excerpt(item.contentSnippet || item.content || item.summary || '', 60);
  const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();
  const article = {
    id: hashId(title + link),
    title,
    description,
    content: stripHtml(item['content:encoded'] || item.content || item.contentSnippet || description),
    source: extractSource(item, fallbackSource),
    sourceUrl: link,
    imageUrl: findImage(item),
    category: cat.id,
    categoryLabel: cat.label,
    icon: cat.icon,
    color: cat.color,
    publishedAt: new Date(publishedAt).toISOString(),
    fetchedAt: new Date().toISOString(),
    tags: [],
  };
  article.importance = scoreImportance(article, cat.importance);
  article.sentiment = sentiment(article.title + ' ' + article.description);
  return article;
}

// Deduplica por id y por similitud de titulo (primeras palabras).
function dedupe(articles) {
  const seen = new Set();
  const sig = new Set();
  const out = [];
  for (const a of articles) {
    if (!a.title || a.title.length < 12) continue;
    if (seen.has(a.id)) continue;
    const signature = a.title.toLowerCase().replace(/[^a-z0-9áéíóúñ ]/gi, '').split(' ').slice(0, 6).join(' ');
    if (sig.has(signature)) continue;
    seen.add(a.id);
    sig.add(signature);
    out.push(a);
  }
  return out;
}

// Lista de feeds (URL + categoria + medio sugerido) a partir de la config.
function buildFeedList() {
  const list = [];
  for (const cat of CATEGORIES) {
    for (const q of cat.queries) {
      list.push({ url: googleNewsRss(q, cat.region), cat, source: 'Google News' });
    }
    for (const feed of cat.feeds) {
      const url = typeof feed === 'string' ? feed : feed.url;
      const source = typeof feed === 'object' ? feed.source : null;
      list.push({ url, cat, source });
    }
  }
  return list;
}

async function fetchFeed({ url, cat, source }) {
  try {
    const feed = await parser.parseURL(url);
    const medium = source || feed.title || cat.label;
    return (feed.items || []).slice(0, 12).map((it) => normalize(it, cat, medium));
  } catch (err) {
    return []; // un feed caido no debe tumbar la agregacion
  }
}

// Obtiene TODO en paralelo, dedup, rankea y recorta por categoria.
async function fetchAll() {
  const feeds = buildFeedList();
  const results = await Promise.allSettled(feeds.map(fetchFeed));
  let all = [];
  for (const r of results) if (r.status === 'fulfilled') all = all.concat(r.value);

  all = dedupe(all);

  // Recorta por categoria respetando `max`, ordenando por importancia y fecha.
  const byCat = {};
  for (const a of all) (byCat[a.category] ||= []).push(a);
  let trimmed = [];
  for (const cat of CATEGORIES) {
    const arr = (byCat[cat.id] || []).sort(
      (x, y) => y.importance - x.importance || new Date(y.publishedAt) - new Date(x.publishedAt)
    );
    trimmed = trimmed.concat(arr.slice(0, cat.max));
  }

  trimmed.sort(
    (x, y) => y.importance - x.importance || new Date(y.publishedAt) - new Date(x.publishedAt)
  );
  return trimmed;
}

// API publica: devuelve articulos del cache, refrescando si expiro.
export async function getArticles({ force = false } = {}) {
  const fresh = Date.now() - cache.fetchedAt < CACHE_TTL_MS;
  if (!force && fresh && cache.articles.length) return cache.articles;

  // Evita fetchs concurrentes duplicados.
  if (cache.fetching) return cache.fetching;

  cache.fetching = (async () => {
    try {
      const articles = await fetchAll();
      if (articles.length) {
        cache = { articles, fetchedAt: Date.now(), fetching: null };
      } else {
        cache.fetching = null;
      }
      return cache.articles;
    } catch (err) {
      cache.fetching = null;
      return cache.articles;
    }
  })();

  return cache.fetching;
}

export function getCacheInfo() {
  return {
    count: cache.articles.length,
    fetchedAt: cache.fetchedAt ? new Date(cache.fetchedAt).toISOString() : null,
    ttlMinutes: CACHE_TTL_MS / 60000,
  };
}
