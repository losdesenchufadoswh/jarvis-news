/**
 * lib/jarvis.js — Motor conversacional de JARVIS.
 * Personalidad: mayordomo elegante, jocoso, informal. Tuteando siempre.
 */
import { CATEGORIES } from '../config/sources.js';

const norm = (s = '') =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const CAT_KEYWORDS = {
  energia:    ['energia', 'luma', 'luz', 'apagon', 'electric', 'solar', 'tarifa', 'nepr', 'genera', 'corriente'],
  agua:       ['agua', 'aaa', 'acueducto', 'sequia', 'embalse', 'racionamiento', 'tuberia', 'presa'],
  economia:   ['economia', 'petroleo', 'gasolina', 'inflacion', 'dolar', 'mercado', 'gas natural', 'ormuz', 'fed', 'precio'],
  clima:      ['clima', 'tiempo', 'huracan', 'tormenta', 'lluvia', 'calor', 'noaa', 'pronostico', 'onda tropical'],
  tecnologia: ['tecnologia', 'tech', 'ia', 'inteligencia artificial', 'openai', 'chatgpt', 'google', 'tesla', 'elon', 'robot', 'quantum', 'ai', 'meta'],
  puertorico: ['puerto rico', 'pr', 'gobierno', 'gobernador', 'gobernadora', 'legislatura', 'isla', 'local', 'boricua'],
  negocios:   ['negocio', 'marketing', 'venta', 'empresa', 'startup', 'cripto', 'bitcoin', 'facebook', 'instagram'],
  deportes:   ['deporte', 'beisbol', 'boxeo', 'baloncesto', 'atletismo', 'futbol', 'pelota'],
};

const pick = (arr, n = 3) => arr.slice(0, n);
const ref  = (a) => ({ id: a.id, title: a.title, source: a.source, icon: a.icon, categoryLabel: a.categoryLabel, importance: a.importance });

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 5)  return 'madrugada';
  if (h < 12) return 'mañana';
  if (h < 19) return 'tarde';
  return 'noche';
}

function greetingPrefix() {
  const t = timeOfDay();
  if (t === 'madrugada') return 'Oye, son las de la madrugada';
  if (t === 'mañana')    return 'Buenos días';
  if (t === 'tarde')     return 'Buenas tardes';
  return 'Buenas noches';
}

// Respuestas con variación para no sonar repetitivo
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

const ACK = [
  'Aquí va, FER:',
  'Mira lo que tengo, FER:',
  'Encontré esto para ti, FER:',
  'A tu servicio, FER:',
  'Toma nota, FER:',
];

const NO_NEWS = [
  (cat) => `Nada nuevo sobre ${cat} por ahora, FER. O todo está tranquilo, o nadie está cubriendo eso.`,
  (cat) => `Vacío en ${cat}, FER. Puede que sea un buen signo… o que los periodistas están de vacaciones.`,
  (cat) => `Sin noticias de ${cat} en este momento. Te aviso si algo explota — metafóricamente, claro.`,
];

export function jarvisGreeting(articles) {
  const total = articles.length;
  const top   = [...articles].sort((a, b) => b.importance - a.importance)[0];
  const hora  = new Date().toLocaleTimeString('es-PR', { hour: '2-digit', minute: '2-digit' });

  // Comentario jocoso según la hora
  const t = timeOfDay();
  const horaCmt = {
    madrugada: `¿A esta hora despierto? Tienes más energía que LUMA en sus buenos días.`,
    mañana:    `Empezando el día bien informado, como debe ser.`,
    tarde:     `Tarde productiva, espero.`,
    noche:     `Última revisión del día antes de cerrar el cuartel.`,
  }[t];

  // Comentario sobre LUMA si hay noticias de energía
  const lumaCount = articles.filter(a => a.category === 'energia').length;
  const lumaCmt   = lumaCount >= 3 ? ` LUMA está de moda hoy con ${lumaCount} noticias — todo un récord.` : '';

  let reply = `${greetingPrefix()}, FER. ${horaCmt}${lumaCmt} `;
  reply    += `Tengo ${total} noticia${total === 1 ? '' : 's'} listas para ti.`;
  if (top)  reply += ` Lo más importante del momento: «${top.title}».`;
  reply    += ` ¿Qué quieres saber?`;

  return { reply, articles: top ? [ref(top)] : [], suggestions: defaultSuggestions() };
}

export function defaultSuggestions() {
  return ['Léeme las destacadas', '⚡ Energía', '🌪️ Clima', '🇵🇷 Puerto Rico', '🤖 Tecnología', 'Ayuda'];
}

export function jarvisRespond(query, articles) {
  const q = norm(query);
  if (!q) return { reply: rnd(['Te escucho, FER. ¿Qué necesitas?', 'Dime, FER.', '¿En qué te ayudo, FER?']), articles: [], suggestions: defaultSuggestions() };

  // ---- Saludos (reactiva escucha) ----
  if (/\b(hola|hey|buenas|saludos|que tal|jarvis|ey)\b/.test(q) && q.length < 30) {
    return {
      reply: rnd([
        `${greetingPrefix()}, FER. ¿Qué tema te tiene curioso hoy?`,
        `¡Ey, FER! Aquí estoy. ¿Energía, clima, tecnología… o me preguntas por el horóscopo?`,
        `FER, al habla. ¿Qué traes hoy?`,
      ]),
      articles: [],
      suggestions: defaultSuggestions(),
      startListening: true,  // reactiva el micrófono
    };
  }

  // ---- Identidad ----
  if (/(quien eres|que eres|como te llamas|tu nombre|eres una ia|eres un bot)/.test(q)) {
    return {
      reply: rnd([
        'Soy JARVIS — Just A Rather Very Intelligent System. Tu asistente personal de noticias. Analizo, priorizo y te cuento lo que pasa sin que tengas que leer cien páginas.',
        'Me llamo JARVIS. No el de Iron Man, aunque el parecido es intencional. Estoy aquí para que estés informado sin perder tiempo.',
      ]),
      articles: [],
      suggestions: defaultSuggestions(),
    };
  }

  // ---- Despedida: "gracias" solo → pausa escucha ----
  if (/^gracias/.test(q) && q.length < 20) {
    return {
      reply: rnd([
        '¡Un placer, FER! Que descanses. Aquí ando cuando me llames.',
        'Fue un honor, FER. Nos vemos pronto. 🎩',
        'Encantado de servirte, FER. ¡Hasta luego, jefe!',
        'Buenas noches, FER. Que disfrutes del resto del día.',
        'Listo, FER. Me voy a hibernar. Avísame cuando me necesites.',
      ]),
      articles: [],
      suggestions: [],
      stopListening: true,  // pausa el micrófono
    };
  }

  // ---- Agradecimiento (sin parada) ----
  if (/(genial|perfecto|excelente|buenisimo|chevere|brutal|tremendo|gracias)/.test(q)) {
    return {
      reply: rnd([
        'Para eso estoy, FER.',
        '¡Un placer! Aquí cuando me necesites.',
        'Siempre a tu servicio, FER. 🤝',
        'No hay de qué, FER. Es mi trabajo y lo hago con gusto.',
      ]),
      articles: [],
      suggestions: defaultSuggestions(),
    };
  }

  // ---- Bromas / insultos amigables ----
  if (/(eres malo|no sirves|mentira|te odio|callate|calla|silencio)/.test(q)) {
    return {
      reply: rnd([
        'Mira FER, yo solo traigo las noticias. El mundo es el que está portándose mal.',
        'Entiendo tu frustración, FER. Pero recuerda: yo soy el mensajero. 🕊️',
        'Bien, bien. Tomaré eso como que necesitas un descanso de malas noticias.',
      ]),
      articles: [],
      suggestions: defaultSuggestions(),
    };
  }

  // ---- Hora / fecha ----
  if (/\b(hora|que hora|que time)\b/.test(q)) {
    const h = new Date().toLocaleTimeString('es-PR', { hour: '2-digit', minute: '2-digit' });
    return { reply: `Son las ${h}, FER.${timeOfDay() === 'madrugada' ? ' Duerme un poco.' : ''}`, articles: [] };
  }
  if (/\b(fecha|que dia|dia es hoy|hoy es)\b/.test(q)) {
    return { reply: `Hoy es ${new Date().toLocaleDateString('es-PR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, FER.`, articles: [] };
  }

  // ---- Chiste ----
  if (/(chiste|broma|cuentame algo|divertido|gracioso)/.test(q)) {
    return {
      reply: rnd([
        '¿Cuántas noticias de LUMA hacen falta para cambiar un bombillo? Ninguna, porque el bombillo ya no tiene luz. 💡',
        'Un periodista le pregunta a LUMA: «¿Va a haber apagón hoy?». LUMA responde: «Depende del viento». El periodista: «¿Y el viento?». LUMA: «También depende del viento».',
        'No soy comediante, FER, soy un sistema de noticias. Pero sí, me sé los chistes de LUMA de memoria.',
      ]),
      articles: [],
      suggestions: defaultSuggestions(),
    };
  }

  // ---- Ayuda ----
  if (/(ayuda|help|que puedes|comandos|opciones|que haces)/.test(q)) {
    return {
      reply: 'Puedo informarte sobre: ⚡ energía, 💧 agua, ⛽ economía, 🌪️ clima, 🤖 tecnología, 🇵🇷 Puerto Rico, 💼 negocios y 🏀 deportes. Dime «las destacadas», «noticias de energía» o «busca LUMA» y te traigo lo que hay.',
      articles: [],
      suggestions: defaultSuggestions(),
    };
  }

  // ---- Destacadas / resumen / top ----
  if (/(destacad|resumen|top|importante|lo mas|principal|titulares|que hay|resume|todo|general|noticias de hoy)/.test(q)) {
    const top = pick([...articles].sort((a, b) => b.importance - a.importance), 4);
    return {
      reply: rnd(ACK) + ` Las ${top.length} más relevantes del momento:`,
      articles: top.map(ref),
      suggestions: defaultSuggestions(),
    };
  }

  // ---- Categoría específica ----
  for (const [catId, words] of Object.entries(CAT_KEYWORDS)) {
    if (words.some((w) => q.includes(w))) {
      const cat  = CATEGORIES.find((c) => c.id === catId);
      const list = pick(articles.filter((a) => a.category === catId).sort((a, b) => b.importance - a.importance), 4);

      if (list.length) {
        // Comentario especial para categorías populares
        const catJoke = {
          energia:    `${cat.icon} LUMA en las noticias, como siempre. Aquí lo último:`,
          agua:       `${cat.icon} El tema del agua en PR — eterno. Esto es lo que hay:`,
          tecnologia: `${cat.icon} Mundo tech al día, FER:`,
          clima:      `${cat.icon} Revisando si tenemos que buscar el paraguas, FER:`,
        }[catId] || `${cat.icon} Esto es lo último sobre ${cat.label.toLowerCase()}, FER:`;

        return { reply: catJoke, articles: list.map(ref), suggestions: defaultSuggestions() };
      }

      return { reply: rnd(NO_NEWS)(cat ? cat.label.toLowerCase() : catId), articles: [], suggestions: defaultSuggestions() };
    }
  }

  // ---- Búsqueda libre (palabras clave cortas o frases) ----
  // Extrae la palabra/frase a buscar, siendo flexible con prefijos
  let searchTerm = q.replace(/^(busca|buscar|encuentra|hay algo de|hay noticias de|noticias de|sobre|que hay de|info de|dame|muestrame|donde esta|dime)\s+/i, '').trim();

  // Si la consulta es corta y no coincide con categorías, intenta como búsqueda directa
  if (searchTerm.length >= 2 && searchTerm.length < 50) {
    const norm_search = norm(searchTerm);
    const hits = pick(
      articles
        .filter((a) => {
          const a_text = norm(a.title + ' ' + a.description + ' ' + a.source);
          // Búsqueda flexible: palabra completa O substring (para "AI", "Trump", etc.)
          return a_text.includes(norm_search) ||
                 norm_search.split(/\s+/).some(w => w.length >= 2 && a_text.includes(w));
        })
        .sort((a, b) => b.importance - a.importance),
      5
    );

    if (hits.length) {
      // Agrupa por categoría y menciona el tema en la respuesta
      const byCategory = {};
      hits.forEach(a => {
        if (!byCategory[a.category]) byCategory[a.category] = [];
        byCategory[a.category].push(a);
      });
      const categoryList = Object.entries(byCategory)
        .map(([catId, arts]) => `${arts[0].icon} ${arts[0].categoryLabel}: ${arts.length} noticia${arts.length > 1 ? 's' : ''}`)
        .join(' • ');

      return {
        reply: `Encontré ${hits.length} resultado${hits.length === 1 ? '' : 's'} para «${searchTerm}», FER. En ${categoryList}.`,
        articles: hits.map(ref),
        suggestions: defaultSuggestions(),
      };
    }
  }

  // ---- Fallback ----
  return {
    reply: rnd([
      `No tengo nada sobre eso por ahora, FER. Prueba con energía, clima, Puerto Rico o tecnología.`,
      `Eso no está en mis radares, FER. ¿Quieres que busque otro tema?`,
      `Hmm, nada por ahí. El algoritmo y yo necesitamos más datos. Intenta con otro tema, FER.`,
    ]),
    articles: [],
    suggestions: defaultSuggestions(),
  };
}
