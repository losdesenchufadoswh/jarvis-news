/**
 * lib/jarvis.js
 * ------------------------------------------------------------------
 * Motor conversacional de JARVIS (basado en intenciones, sin API key).
 * Entiende lenguaje natural simple en espanol y consulta las noticias
 * reales ya agregadas para responder con datos.
 *
 * Si en el futuro quieres una IA real (Claude/GPT), puedes enrutar la
 * consulta a un LLM en server.js cuando exista una API key; el formato
 * de respuesta { reply, articles } se mantiene igual.
 * ------------------------------------------------------------------
 */
import { CATEGORIES } from '../config/sources.js';

const norm = (s = '') =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Palabras clave -> id de categoria.
const CAT_KEYWORDS = {
  energia: ['energia', 'luma', 'luz', 'apagon', 'electric', 'solar', 'tarifa', 'nepr', 'genera'],
  agua: ['agua', 'aaa', 'acueducto', 'sequia', 'embalse', 'racionamiento', 'tuberia'],
  economia: ['economia', 'petroleo', 'gasolina', 'inflacion', 'dolar', 'mercado', 'gas natural', 'ormuz', 'fed'],
  clima: ['clima', 'tiempo', 'huracan', 'tormenta', 'lluvia', 'calor', 'noaa', 'pronostico'],
  tecnologia: ['tecnologia', 'tech', 'ia', 'inteligencia artificial', 'openai', 'chatgpt', 'google', 'tesla', 'elon', 'robot', 'quantum', 'ai'],
  puertorico: ['puerto rico', 'pr', 'gobierno', 'gobernador', 'legislatura', 'isla', 'local'],
  negocios: ['negocio', 'marketing', 'venta', 'empresa', 'startup', 'cripto', 'meta', 'facebook'],
  deportes: ['deporte', 'beisbol', 'boxeo', 'baloncesto', 'atleta'],
};

const pick = (arr, n = 3) => arr.slice(0, n);
const ref = (a) => ({ id: a.id, title: a.title, source: a.source, icon: a.icon, categoryLabel: a.categoryLabel, importance: a.importance });

function greetingPrefix() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

// Saludo de bienvenida (se muestra al entrar al inicio).
export function jarvisGreeting(articles) {
  const total = articles.length;
  const top = [...articles].sort((a, b) => b.importance - a.importance)[0];
  const fecha = new Date().toLocaleDateString('es-PR', { weekday: 'long', day: 'numeric', month: 'long' });
  const hora = new Date().toLocaleTimeString('es-PR', { hour: '2-digit', minute: '2-digit' });
  let reply = `${greetingPrefix()}, FER. Soy JARVIS, su asistente de noticias. `;
  reply += `Hoy es ${fecha} y son las ${hora.replace(/\.\s*$/, '')}. `;
  reply += `He compilado ${total} noticia${total === 1 ? '' : 's'} relevantes para usted.`;
  if (top) reply += ` La prioridad del día: «${top.title}».`;
  reply += ` ¿En qué puedo ayudarle?`;
  return { reply, articles: top ? [ref(top)] : [], suggestions: defaultSuggestions() };
}

export function defaultSuggestions() {
  return ['Léeme las destacadas', '⚡ Energía', '🌪️ Clima', '🇵🇷 Puerto Rico', '🤖 Tecnología', 'Ayuda'];
}

// Procesa una consulta del usuario.
export function jarvisRespond(query, articles) {
  const q = norm(query);
  if (!q) return { reply: 'Le escucho, FER. Dígame qué necesita.', articles: [], suggestions: defaultSuggestions() };

  // ---- Saludos ----
  if (/\b(hola|hey|buenas|saludos|que tal|jarvis)\b/.test(q) && q.length < 30) {
    return { reply: `${greetingPrefix()}, FER. A su servicio. ¿Sobre qué tema desea informarse?`, articles: [], suggestions: defaultSuggestions() };
  }

  // ---- Identidad ----
  if (/(quien eres|que eres|como te llamas|tu nombre)/.test(q)) {
    return { reply: 'Soy JARVIS — Just A Rather Very Intelligent System. Su asistente personal de noticias. Analizo y priorizo la información del día para que no pierda tiempo.', articles: [], suggestions: defaultSuggestions() };
  }

  // ---- Agradecimiento ----
  if (/(gracias|thank|genial|perfecto|excelente)/.test(q)) {
    return { reply: 'Siempre a su servicio, FER.', articles: [], suggestions: defaultSuggestions() };
  }

  // ---- Hora / fecha ----
  if (/\b(hora|que hora)\b/.test(q)) {
    return { reply: `Son las ${new Date().toLocaleTimeString('es-PR', { hour: '2-digit', minute: '2-digit' })}, FER.`, articles: [] };
  }
  if (/\b(fecha|que dia|dia es hoy)\b/.test(q)) {
    return { reply: `Hoy es ${new Date().toLocaleDateString('es-PR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`, articles: [] };
  }

  // ---- Ayuda ----
  if (/(ayuda|help|que puedes|comandos|opciones)/.test(q)) {
    return {
      reply: 'Puedo informarle sobre: ⚡ energía, 💧 agua, ⛽ economía, 🌪️ clima, 🤖 tecnología, 🇵🇷 Puerto Rico, 💼 negocios y 🏀 deportes. Pídame «las destacadas», «noticias de [tema]» o «busca [palabra]».',
      articles: [],
      suggestions: defaultSuggestions(),
    };
  }

  // ---- Destacadas / resumen / top ----
  if (/(destacad|resumen|top|importante|lo mas|principal|titulares|que hay)/.test(q)) {
    const top = pick([...articles].sort((a, b) => b.importance - a.importance), 4);
    return {
      reply: `Estas son las noticias más relevantes del momento, FER:`,
      articles: top.map(ref),
      suggestions: defaultSuggestions(),
    };
  }

  // ---- Categoria especifica ----
  for (const [catId, words] of Object.entries(CAT_KEYWORDS)) {
    if (words.some((w) => q.includes(w))) {
      const cat = CATEGORIES.find((c) => c.id === catId);
      const list = pick(articles.filter((a) => a.category === catId).sort((a, b) => b.importance - a.importance), 4);
      if (list.length) {
        return {
          reply: `${cat.icon} Esto es lo último sobre ${cat.label.toLowerCase()}, FER:`,
          articles: list.map(ref),
          suggestions: defaultSuggestions(),
        };
      }
      return { reply: `No tengo novedades de ${cat ? cat.label.toLowerCase() : catId} en este momento, FER. ¿Desea otro tema?`, articles: [], suggestions: defaultSuggestions() };
    }
  }

  // ---- Busqueda libre ----
  const clean = q.replace(/^(busca|buscar|encuentra|hay algo de|noticias de|sobre|que hay de|info de)\s+/i, '').trim();
  if (clean.length >= 3) {
    const hits = pick(
      articles.filter((a) => norm(a.title + ' ' + a.description + ' ' + a.source).includes(clean)).sort((a, b) => b.importance - a.importance),
      5
    );
    if (hits.length) {
      return { reply: `Encontré ${hits.length} resultado${hits.length === 1 ? '' : 's'} para «${clean}», FER:`, articles: hits.map(ref), suggestions: defaultSuggestions() };
    }
  }

  // ---- Fallback ----
  return {
    reply: `No encontré información sobre eso, FER. Puede pedirme las destacadas o consultar un tema como energía, clima o tecnología.`,
    articles: [],
    suggestions: defaultSuggestions(),
  };
}
