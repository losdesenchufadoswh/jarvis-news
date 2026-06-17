/**
 * config/sources.js
 * ------------------------------------------------------------------
 * Definicion de TODAS las categorias, subtemas y fuentes de noticias.
 *
 * Estrategia de obtencion (sin API key, gratis y localizado a PR):
 *   1) Google News RSS por busqueda  -> permite consultas por subtema
 *      y localizacion a Puerto Rico en espanol. Es la fuente principal.
 *   2) Feeds RSS directos            -> medios que publican RSS estable
 *      (NYT, The Verge, NOAA/NHC, El Pais, BBC Mundo...).
 *
 * COMO ADAPTAR:
 *   - Para anadir un subtema a una categoria, agrega una cadena al array
 *     `queries`. Se convierte automaticamente en un feed de Google News.
 *   - Para anadir un medio con RSS propio, agrega su URL a `feeds`.
 *   - Para crear una categoria nueva, copia un bloque y cambia id/label/icon.
 *   - `lang` controla idioma/region del Google News RSS de esa categoria.
 * ------------------------------------------------------------------
 */

// Construye una URL de Google News RSS a partir de una consulta de busqueda.
export function googleNewsRss(query, { hl = 'es-419', gl = 'US', ceid = 'US:es-419' } = {}) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

// Region por defecto para consultas en espanol orientadas a PR/Latam.
const ES = { hl: 'es-419', gl: 'US', ceid: 'US:es-419' };
// Region para consultas globales en ingles (tecnologia/IA, mercados).
const EN = { hl: 'en-US', gl: 'US', ceid: 'US:en' };

/**
 * Cada categoria:
 *   id          -> clave interna y de API (/api/news/category/:id)
 *   label       -> nombre visible
 *   icon        -> emoji
 *   importance  -> peso base 1-10 (afecta ranking)
 *   color       -> color de acento de la tarjeta
 *   region      -> region Google News
 *   queries     -> subtemas (cada uno => 1 feed de busqueda)
 *   feeds       -> URLs RSS directas adicionales
 *   max         -> maximo de noticias a conservar tras ranking
 */
export const CATEGORIES = [
  {
    id: 'energia',
    label: 'Energia',
    icon: '⚡',
    importance: 10,
    color: '#FFB300',
    region: ES,
    queries: [
      'LUMA Energy Puerto Rico',
      'apagones Puerto Rico',
      'tarifa electrica Puerto Rico NEPR',
      'energia solar Puerto Rico net metering',
      'generacion electrica Puerto Rico Genera PR',
      'baterias almacenamiento energia Puerto Rico',
      'Tesla energia renovable',
    ],
    feeds: [],
    max: 8,
  },
  {
    id: 'agua',
    label: 'Agua e Infraestructura',
    icon: '💧',
    importance: 9,
    color: '#00A8FF',
    region: ES,
    queries: [
      'AAA Acueductos Puerto Rico racionamiento',
      'sequia Puerto Rico embalses niveles',
      'corte de agua Puerto Rico',
      'rotura tuberia agua Puerto Rico',
      'calidad del agua Puerto Rico',
    ],
    feeds: [],
    max: 6,
  },
  {
    id: 'economia',
    label: 'Petroleo y Economia',
    icon: '⛽',
    importance: 8,
    color: '#00FF41',
    region: ES,
    queries: [
      'precio petroleo WTI Brent',
      'gas natural precio',
      'inflacion Estados Unidos Reserva Federal',
      'tasas de interes Fed decision',
      'Estrecho de Ormuz petroleo',
    ],
    feeds: [
      'https://oilprice.com/rss/main',
    ],
    max: 6,
  },
  {
    id: 'clima',
    label: 'Clima y Huracanes',
    icon: '🌪️',
    importance: 10,
    color: '#FF4444',
    region: ES,
    queries: [
      'huracan tormenta tropical Puerto Rico NOAA',
      'pronostico tiempo Puerto Rico',
      'ola de calor Puerto Rico',
      'cambio climatico Caribe',
    ],
    feeds: [
      // National Hurricane Center - Atlantic
      'https://www.nhc.noaa.gov/index-at.xml',
    ],
    max: 6,
  },
  {
    id: 'tecnologia',
    label: 'Tecnologia & IA',
    icon: '🤖',
    importance: 8,
    color: '#00A8FF',
    region: EN,
    queries: [
      'OpenAI ChatGPT announcement',
      'Google DeepMind Gemini AI',
      'Tesla Elon Musk FSD Optimus',
      'Meta Llama AI',
      'artificial intelligence breakthrough',
      'quantum computing chips',
      'nuclear energy SMR fusion',
    ],
    feeds: [
      'https://www.theverge.com/rss/index.xml',
      'https://techcrunch.com/feed/',
      'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    ],
    max: 8,
  },
  {
    id: 'puertorico',
    label: 'Puerto Rico',
    icon: '🇵🇷',
    importance: 10,
    color: '#D4AF37',
    region: ES,
    queries: [
      'gobierno Puerto Rico gobernadora',
      'legislatura Puerto Rico proyecto de ley',
      'infraestructura Puerto Rico carreteras',
      'salud publica Puerto Rico',
      'economia empleo Puerto Rico',
      'deuda Puerto Rico PROMESA presupuesto',
    ],
    feeds: [
      'https://www.elnuevodiario.com.do/feed/',
    ],
    max: 8,
  },
  {
    id: 'negocios',
    label: 'Negocios & Emprendimiento',
    icon: '💼',
    importance: 6,
    color: '#D4AF37',
    region: ES,
    queries: [
      'tendencias marketing digital ventas',
      'Meta Facebook Instagram publicidad algoritmo',
      'startups financiamiento tecnologia',
      'criptomonedas fintech blockchain',
    ],
    feeds: [],
    max: 5,
  },
  {
    id: 'deportes',
    label: 'Deportes',
    icon: '🏀',
    importance: 3,
    color: '#A0A0A0',
    region: ES,
    queries: [
      'deportes Puerto Rico atletas',
      'beisbol boxeo baloncesto Puerto Rico',
    ],
    feeds: [],
    max: 3,
  },
];

// Palabras clave que elevan la "importancia" de una noticia en el ranking.
export const PRIORITY_KEYWORDS = [
  // criticas
  { words: ['huracan', 'tormenta', 'emergencia', 'alerta', 'evacuac'], boost: 4 },
  { words: ['apagon', 'corte', 'racionamiento', 'sin luz', 'sin agua'], boost: 3 },
  { words: ['luma', 'aaa', 'nepr', 'genera'], boost: 2 },
  { words: ['aumento', 'tarifa', 'sube', 'precio'], boost: 2 },
  { words: ['puerto rico', 'gobernador', 'gobernadora', 'nuevo dia', 'nytimes'], boost: 3 },
  { words: ['openai', 'chatgpt', 'claude', 'gemini', 'gpt-', 'tesla', 'elon'], boost: 2 },
  { words: ['inflacion', 'reserva federal', 'fed', 'petroleo', 'ormuz'], boost: 1 },
];

export const SETTINGS_DEFAULT = {
  categories: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.id !== 'deportes'])),
  updateTime: '07:00',
  theme: 'dark',
  notifications: false,
  language: 'es',
};
