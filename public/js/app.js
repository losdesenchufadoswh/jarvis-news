/* app.js — arranque, routing por hash y render de todas las pantallas. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const view = $('#view');
  let CATS = [];          // metadata de categorias (del backend)
  let cacheAll = null;    // cache de "todas" para filtros sin re-fetch

  // ---------------- TOAST ----------------
  let toastT;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ---------------- RELOJ + ESTADO ----------------
  function tickClock() {
    const now = new Date();
    const c = $('#clock');
    if (c) c.textContent = now.toLocaleTimeString('es-PR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const cc = $('#cmdClock');
    if (cc) cc.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  function setStatus(updatedIso) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    $('#dateLabel').textContent = '📅 ' + UI.fmtDate(y.toISOString()).replace(/^\w/, (c) => c.toUpperCase());
    $('#updatedLabel').textContent = 'Última actualización: ' + (updatedIso ? UI.fmtDate(updatedIso, true) : '—');
  }

  // ---------------- SPLASH ----------------
  function runSplash() {
    const msgs = [
      'Inicializando sistema de noticias…',
      'Conectando con fuentes de Puerto Rico…',
      'Analizando energía, agua y clima…',
      'Rastreando tecnología e IA…',
      'Rankeando por relevancia…',
      'Compilando tu resumen del día…',
    ];
    const bar = $('#splashBar'), status = $('#splashStatus');
    let p = 0, i = 0;
    const t = setInterval(() => {
      p = Math.min(100, p + Math.random() * 22 + 8);
      bar.style.width = p + '%';
      status.textContent = msgs[Math.min(i, msgs.length - 1)]; i++;
      if (p >= 100) {
        clearInterval(t);
        setTimeout(() => {
          $('#splash').classList.add('fade');
          $('#app').classList.remove('hidden');
          setTimeout(() => $('#splash').remove(), 700);
        }, 350);
      }
    }, 430);
  }

  // ================= ROUTER =================
  const routes = {
    '#/home': renderHome,
    '#/chat': renderChat,
    '#/all': renderAll,
    '#/favorites': renderFavorites,
    '#/archive': renderArchive,
    '#/settings': renderSettings,
  };

  function router() {
    let hash = location.hash || '#/chat';
    const [base] = hash.split('?');
    // Si salimos del chat, destruye el reconocimiento de voz
    if (base !== '#/chat' && JarvisVoice.isSupported()) JarvisVoice.destroy();
    // ruta de detalle: #/article/:id
    if (base.startsWith('#/article/')) {
      renderDetail(decodeURIComponent(base.replace('#/article/', '')));
    } else if (base.startsWith('#/category/')) {
      renderCategory(decodeURIComponent(base.replace('#/category/', '')));
    } else {
      (routes[base] || renderHome)();
    }
    // marca el icono activo en el dock
    let activeRoute = base;
    if (base.startsWith('#/article/') || base.startsWith('#/category/')) activeRoute = '#/all';
    document.querySelectorAll('.dock-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.route === activeRoute));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // SVG del casco de Iron Man (figura central).
  const HELMET_SVG = `
    <svg class="helmet" viewBox="0 0 100 120" fill="none" aria-hidden="true">
      <path d="M50 8 C30 8 19 22 19 45 C19 72 30 98 50 113 C70 98 81 72 81 45 C81 22 70 8 50 8 Z" stroke="currentColor" stroke-width="2.4"/>
      <path d="M50 12 L50 60" stroke="currentColor" stroke-width="1.5" opacity=".55"/>
      <path d="M27 40 C33 36 40 35 46 37" stroke="currentColor" stroke-width="1.4" opacity=".5"/>
      <path d="M73 40 C67 36 60 35 54 37" stroke="currentColor" stroke-width="1.4" opacity=".5"/>
      <path class="eye" d="M30 53 L45 48 L45 58 L31 61 Z"/>
      <path class="eye" d="M70 53 L55 48 L55 58 L69 61 Z"/>
      <path d="M40 80 h20 M42 88 h16 M45 95 h10" stroke="currentColor" stroke-width="1.5" opacity=".55"/>
    </svg>`;

  // ================= HOME (Command Center) =================
  async function renderHome() {
    view.innerHTML = `
      <div class="cmd">
        <aside class="cmd-left">
          <div class="hud-ttl">NOTICIAS DESTACADAS</div>
          <div id="cmdFeatured">${UI.loading('Cargando…')}</div>
        </aside>
        <div class="cmd-center">
          <div class="jbig" id="jbig" title="Hablar con JARVIS">
            <div class="glow"></div>
            <svg class="jsvg" viewBox="0 0 220 220" aria-hidden="true">
              <circle class="r-ticks" cx="110" cy="110" r="100"/>
              <circle class="r-arc"   cx="110" cy="110" r="86"/>
              <circle class="r-arc2"  cx="110" cy="110" r="72"/>
              <circle class="r-dash"  cx="110" cy="110" r="58"/>
              <circle class="r-glow"  cx="110" cy="110" r="44"/>
            </svg>
            ${HELMET_SVG}
          </div>
          <div class="cmd-clock" id="cmdClock">--:--</div>
          <div class="cmd-sub">J.A.R.V.I.S · SISTEMA EN LÍNEA · <span id="cmdCount">—</span></div>
          <button class="cmd-cta" data-route="#/chat">💬 Hablar con JARVIS</button>
        </div>
      </div>`;
    $('#jbig').addEventListener('click', () => { location.hash = '#/chat'; });
    tickClock();
    if (!welcomed) {
      welcomed = true;
      const pre = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';
      setTimeout(() => toast(`${pre}, FER. JARVIS en línea. 🔵`), 600);
    }
    try {
      const articles = await Api.yesterday();
      cacheAll = null;
      setStatus(articles[0]?.fetchedAt);
      const featured = [...articles].sort((a, b) => b.importance - a.importance).slice(0, 6);
      $('#cmdFeatured').innerHTML = featured.length ? UI.grid(featured, { list: true }) : UI.empty('Sin noticias. Pulsa Refrescar.', '📭');
      const cc = $('#cmdCount'); if (cc) cc.textContent = articles.length + ' NOTICIAS';
    } catch (e) {
      $('#cmdFeatured').innerHTML = UI.empty('No pude conectar con el servidor.', '⚠️');
    }
  }

  // ================= CHAT (pestaña JARVIS) =================
  async function renderChat() {
    const voiceSupported = JarvisVoice.isSupported();
    view.innerHTML = `
      <div class="jarvis-hero">
        <div class="jchat">
          <div class="jchat-head">
            <div class="jchat-orb"></div>
            <div class="jchat-id"><b>JARVIS</b><small><i></i>EN LÍNEA</small></div>
            <div class="sys">SISTEMA <b>OK</b><br>BASE <b id="jSys">—</b></div>
            ${voiceSupported ? '<button class="jmute" id="jMute" title="Silenciar/Activar voz">🔊</button>' : ''}
          </div>
          <div class="jchat-msgs" id="jMsgs"></div>
          <div class="jchat-sugs" id="jSugs"></div>
          ${voiceSupported ? '<div class="jlisten-bar" id="jListenBar"><span class="jlisten-dot"></span><span>Escuchando…</span></div>' : ''}
          <form class="jchat-input" id="jForm" autocomplete="off">
            <input id="jInput" placeholder="Habla o escribe a JARVIS…" autocomplete="off"/>
            <button class="jchat-send" type="submit" title="Enviar">➤</button>
          </form>
        </div>
      </div>`;

    renderSugs(JARVIS_DEFAULT_SUGS);

    // Inicializa Web Speech API (continuo)
    if (voiceSupported) {
      JarvisVoice.init({
        onTranscript: (text) => {
          if (text) jarvisAsk(text);
        },
        onListenChange: (isListening) => {
          const bar = $('#jListenBar');
          if (bar) bar.classList.toggle('active', isListening);
        },
      });
      $('#jMute').addEventListener('click', () => {
        const muted = JarvisVoice.toggleMute();
        $('#jMute').textContent = muted ? '🔇' : '🔊';
      });
    }

    $('#jForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = $('#jInput'); const v = inp.value.trim(); inp.value = '';
      if (v) jarvisAsk(v);
    });
    $('#jSugs').addEventListener('click', (e) => {
      const s = e.target.closest('[data-sug]');
      if (s) jarvisAsk(s.dataset.sug);
    });

    // Siempre re-saluda al entrar al chat (nueva personalidad cada sesión)
    chatLog = [];
    jarvisGreet();

    Api.yesterday().then((a) => {
      setStatus(a[0]?.fetchedAt);
      const js = $('#jSys'); if (js) js.textContent = a.length + ' noticias';
    }).catch(() => {});
  }

  // ---------------- CHAT JARVIS ----------------
  let chatLog = [];                       // historial de la conversacion (persiste al navegar)
  let welcomed = false;                   // saludo de bienvenida (una vez por sesion)
  const JARVIS_DEFAULT_SUGS = ['Léeme las destacadas', '⚡ Energía', '🌪️ Clima', '🇵🇷 Puerto Rico', '🤖 Tecnología', 'Ayuda'];
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function paintMsg(role) {
    const msgs = $('#jMsgs'); if (!msgs) return null;
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + role;
    wrap.innerHTML = `<div class="av">${role === 'bot' ? 'J' : '🧑'}</div><div class="bubble"></div>`;
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
    return wrap.querySelector('.bubble');
  }
  function refsHtml(articles) {
    if (!articles || !articles.length) return '';
    return articles.map((a) => `
      <div class="jref" data-open="${UI.esc(a.id)}">
        <span class="ji">${a.icon || '📰'}</span>
        <div><div class="jt">${UI.esc(a.title)}</div>
          <div class="jm">${UI.esc(a.source || '')} · ${UI.esc(a.categoryLabel || '')}</div></div>
      </div>`).join('');
  }
  function typewrite(el, text, done) {
    if (reduceMotion) { el.textContent = text; done && done(); return; }
    el.innerHTML = `<span class="tw-text"></span><span class="tw-caret">&nbsp;</span>`;
    const span = el.querySelector('.tw-text');
    const speed = text.length > 110 ? 11 : 20;
    let i = 0;
    const t = setInterval(() => {
      span.textContent = text.slice(0, ++i);
      const m = $('#jMsgs'); if (m) m.scrollTop = m.scrollHeight;
      if (i >= text.length) { clearInterval(t); el.querySelector('.tw-caret')?.remove(); done && done(); }
    }, speed);
  }
  function showTyping() {
    const msgs = $('#jMsgs'); if (!msgs) return;
    const w = document.createElement('div'); w.className = 'msg bot'; w.id = 'jTyping';
    w.innerHTML = `<div class="av">J</div><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div>`;
    msgs.appendChild(w); msgs.scrollTop = msgs.scrollHeight;
  }
  function hideTyping() { $('#jTyping')?.remove(); }
  function speakText(text) {
    if (!JarvisVoice.isSupported() || JarvisVoice.isMuted()) return;
    JarvisVoice.speak(text);
  }
  function renderSugs(list) {
    const el = $('#jSugs'); if (!el) return;
    el.innerHTML = (list || []).map((s) => `<button class="jsug" type="button" data-sug="${UI.esc(s)}">${UI.esc(s)}</button>`).join('');
  }
  function paintChatLog() {
    const msgs = $('#jMsgs'); if (!msgs) return;
    msgs.innerHTML = '';
    for (const m of chatLog) {
      const b = paintMsg(m.role); if (!b) continue;
      b.textContent = m.text;
      if (m.role === 'bot' && m.articles && m.articles.length) b.insertAdjacentHTML('beforeend', refsHtml(m.articles));
    }
    msgs.scrollTop = msgs.scrollHeight;
  }
  async function jarvisGreet() {
    showTyping();
    try {
      const [g, articles] = await Promise.all([Api.jarvisGreeting(), Api.yesterday()]);
      hideTyping();

      // 1. Muestra el saludo en el chat
      chatLog.push({ role: 'bot', text: g.reply, articles: g.articles || [] });
      const bb = paintMsg('bot');
      typewrite(bb, g.reply, () => {
        if (g.articles && g.articles.length) bb.insertAdjacentHTML('beforeend', refsHtml(g.articles));
      });
      renderSugs(g.suggestions || JARVIS_DEFAULT_SUGS);

      // 2. Prepara titulares del día
      const top5 = [...articles].sort((a, b) => b.importance - a.importance).slice(0, 5);
      const headlineLines = top5.map((a, i) => `${i + 1}. ${a.title}`).join('\n');
      const headlineText  = top5.map((a, i) => `${i + 1}. ${a.title}`).join('. ');

      // 3. Habla saludo → luego titulares → luego empieza a escuchar
      if (JarvisVoice.isSupported() && !JarvisVoice.isMuted()) {
        JarvisVoice.speak(g.reply, () => {
          // Muestra titulares en chat
          const msg = `📰 Titulares del día:\n${headlineLines}`;
          chatLog.push({ role: 'bot', text: msg, articles: [] });
          const tb = paintMsg('bot');
          if (tb) typewrite(tb, msg);

          // Habla los titulares
          JarvisVoice.speak('Los titulares del día son: ' + headlineText, () => {
            JarvisVoice.start(); // empieza a escuchar
          });
        });
      } else {
        // Sin voz: solo muestra los titulares en chat
        const msg = `📰 Titulares del día:\n${headlineLines}`;
        chatLog.push({ role: 'bot', text: msg, articles: [] });
        setTimeout(() => { const tb = paintMsg('bot'); if (tb) typewrite(tb, msg); }, 800);
        if (JarvisVoice.isSupported()) JarvisVoice.start();
      }
    } catch (e) {
      hideTyping();
      const bb = paintMsg('bot');
      if (bb) bb.textContent = 'Sistema en línea, señor.';
      chatLog.push({ role: 'bot', text: bb ? bb.textContent : '', articles: [] });
      if (JarvisVoice.isSupported()) JarvisVoice.start();
    }
  }
  async function jarvisAsk(text) {
    text = (text || '').trim(); if (!text) return;
    JarvisVoice.stop(); // pausa mientras procesa
    chatLog.push({ role: 'user', text });
    const ub = paintMsg('user'); if (ub) ub.textContent = text;
    showTyping();
    try {
      const res = await Api.jarvisAsk(text);
      hideTyping();
      chatLog.push({ role: 'bot', text: res.reply, articles: res.articles });
      const bb = paintMsg('bot');
      typewrite(bb, res.reply, () => {
        if (res.articles && res.articles.length) bb.insertAdjacentHTML('beforeend', refsHtml(res.articles));
        const m = $('#jMsgs'); if (m) m.scrollTop = m.scrollHeight;
      });
      speakText(res.reply);
      renderSugs(res.suggestions || JARVIS_DEFAULT_SUGS);

      // Maneja flags de control de escucha
      if (res.stopListening && JarvisVoice.isSupported()) {
        JarvisVoice.stop(); // pausa el micrófono (despedida)
      } else if (res.startListening && JarvisVoice.isSupported() && !JarvisVoice.isMuted()) {
        // Reactiva con delay para no capturar eco
        setTimeout(() => JarvisVoice.start(), 2000);
      }
    } catch (e) {
      hideTyping();
      const bb = paintMsg('bot');
      if (bb) bb.textContent = 'Disculpe, señor. No puedo procesar eso en este momento.';
      if (JarvisVoice.isSupported() && !JarvisVoice.isMuted()) JarvisVoice.start();
    }
  }

  function inferCats(articles) {
    const seen = new Map();
    articles.forEach((a) => { if (!seen.has(a.category)) seen.set(a.category, { id: a.category, label: a.categoryLabel, icon: a.icon }); });
    return [...seen.values()];
  }

  // ================= ALL (grid + filtros + buscar) =================
  let allState = { q: '', cat: 'all', source: 'all', sort: 'importance', list: false };
  async function renderAll() {
    view.innerHTML = `
      <div class="page-head"><div class="page-title">📰 Todas las noticias
        <small>Máximo 50 — filtra, busca y ordena</small></div></div>
      <div class="toolbar">
        <div class="search">🔎<input id="q" placeholder="Buscar por palabra clave…" value="${UI.esc(allState.q)}"/></div>
        <select class="select" id="sort">
          <option value="importance">Más importante</option>
          <option value="recent">Más reciente</option>
        </select>
        <select class="select" id="source">
          <option value="all">Todas las fuentes</option>
        </select>
        <button class="chip ${allState.list ? '' : 'active'}" id="viewGrid">▦ Grid</button>
        <button class="chip ${allState.list ? 'active' : ''}" id="viewList">≣ Lista</button>
      </div>
      <div id="chips" class="toolbar"></div>
      <div id="results">${UI.loading()}</div>`;

    $('#sort').value = allState.sort;
    const chips = $('#chips');
    const cats = [{ id: 'all', label: 'Todas', icon: '🌐' }, ...(CATS.length ? CATS : [])];
    chips.innerHTML = cats.map((c) =>
      `<button class="chip ${allState.cat === c.id ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${UI.esc(c.label)}</button>`).join('');

    if (!cacheAll) cacheAll = await Api.all();
    const sources = await Api.sources();
    const sourceSelect = $('#source');
    sources.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      sourceSelect.appendChild(opt);
    });
    sourceSelect.value = allState.source;
    paintAll();

    $('#q').addEventListener('input', (e) => { allState.q = e.target.value; paintAll(); });
    $('#sort').addEventListener('change', (e) => { allState.sort = e.target.value; paintAll(); });
    $('#source').addEventListener('change', (e) => { allState.source = e.target.value; paintAll(); });
    $('#viewGrid').addEventListener('click', () => { allState.list = false; renderAll(); });
    $('#viewList').addEventListener('click', () => { allState.list = true; renderAll(); });
    chips.querySelectorAll('[data-cat]').forEach((b) =>
      b.addEventListener('click', () => { allState.cat = b.dataset.cat; renderAll(); }));
  }
  function paintAll() {
    let list = [...(cacheAll || [])];
    if (allState.cat !== 'all') list = list.filter((a) => a.category === allState.cat);
    if (allState.source !== 'all') list = list.filter((a) => a.source === allState.source);
    if (allState.q.trim()) {
      const q = allState.q.toLowerCase();
      list = list.filter((a) => (a.title + a.description + a.source).toLowerCase().includes(q));
    }
    list.sort(allState.sort === 'recent'
      ? (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
      : (a, b) => b.importance - a.importance);
    $('#results').innerHTML = `<p class="card-meta" style="margin-bottom:12px">${list.length} resultado(s)</p>` + UI.grid(list, { list: allState.list });
  }

  // ================= CATEGORY =================
  async function renderCategory(id) {
    const meta = (CATS.find((c) => c.id === id)) || { label: id, icon: '📰' };
    view.innerHTML = `<div class="page-head"><div class="page-title">${meta.icon} ${UI.esc(meta.label)}</div>
      <button class="btn" data-route="#/all">← Todas</button></div>${UI.loading()}`;
    const list = await Api.category(id);
    view.querySelector('.page-head').insertAdjacentHTML('afterend', UI.grid(list));
    view.querySelector('.loading-state')?.remove();
  }

  // ================= DETAIL =================
  async function renderDetail(id) {
    view.innerHTML = UI.loading('Abriendo artículo…');
    try {
      const a = await Api.article(id);
      Store.addHistory(a);
      const fav = Store.isFavorite(a.id);
      const summary = a.content && a.content.length > (a.description || '').length ? a.content : a.description;
      view.innerHTML = `
      <div class="detail">
        <button class="btn back" onclick="history.back()">← Atrás</button>
        <span class="card-cat" style="--cat:${UI.esc(a.color)}">${a.icon} ${UI.esc(a.categoryLabel)}</span>
        <h1>${UI.esc(a.title)}</h1>
        <div class="meta">
          <span>📰 ${UI.esc(a.source)}</span><span>•</span>
          <span>🕒 ${UI.fmtDate(a.publishedAt, true)}</span><span>•</span>
          <span>⭐ ${a.importance}/10</span>
          <span class="senti ${UI.esc(a.sentiment)}"></span>
        </div>
        ${a.imageUrl ? `<img class="hero" src="${UI.esc(a.imageUrl)}" onerror="this.remove()" alt=""/>` : ''}
        <div class="summary-box">
          <div class="lbl">📋 RESUMEN — JARVIS</div>
          <p>${UI.esc(summary || 'Sin resumen disponible. Entra al enlace para leer la noticia completa.')}</p>
        </div>
        ${(a.tags && a.tags.length) ? `<div class="tags">${a.tags.map((t) => `<span class="tag">#${UI.esc(t)}</span>`).join('')}</div>` : ''}
        ${a.sourceUrl ? `<div style="margin-bottom:8px"><a class="read-link" href="${UI.esc(a.sourceUrl)}" target="_blank" rel="noopener">🔗 Entrar al enlace y leer la noticia completa ↗</a></div>
          <p class="cmd-sub" style="margin-bottom:22px">Se abrirá en ${UI.esc(a.source)} en una pestaña nueva.</p>` : ''}
        <div class="actions">
          <button class="btn fav ${fav ? 'active' : ''}" data-fav="${UI.esc(a.id)}">${fav ? '❤️ Guardado' : '🤍 Favorito'}</button>
          <button class="btn" data-share='${UI.esc(JSON.stringify({ title: a.title, url: a.sourceUrl }))}'>🔗 Compartir</button>
        </div>
        ${(a.related && a.related.length) ? `<div class="related"><h3>Noticias relacionadas</h3>${UI.grid(a.related)}</div>` : ''}
      </div>`;
    } catch (e) {
      view.innerHTML = UI.empty('No se encontró el artículo.', '🔍');
    }
  }

  // ================= FAVORITES =================
  function renderFavorites() {
    const favs = Store.getFavorites();
    view.innerHTML = `<div class="page-head"><div class="page-title">❤️ Favoritos
      <small>${favs.length} noticia(s) guardada(s)</small></div></div>` +
      (favs.length ? UI.grid(favs) : UI.empty('Aún no has guardado noticias. Toca 🤍 en cualquier tarjeta.', '💛'));
  }

  // ================= ARCHIVE (calendario 30 dias) =================
  let calMonth = new Date();
  async function renderArchive(selDate) {
    view.innerHTML = `<div class="page-head"><div class="page-title">🗓️ Historial
      <small>Selecciona una fecha (últimos 30 días)</small></div></div>
      <div id="calWrap"></div><div id="archResults" style="margin-top:20px"></div>`;
    paintCalendar(selDate);
  }
  function paintCalendar(selDate) {
    const wrap = $('#calWrap');
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthName = calMonth.toLocaleDateString('es-PR', { month: 'long', year: 'numeric' });
    let cells = ['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d) => `<div class="cal-cell dow">${d}</div>`).join('');
    for (let i = 0; i < first; i++) cells += '<div class="cal-cell"></div>';
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      const iso = date.toISOString().slice(0, 10);
      const future = date > today;
      const sel = selDate === iso;
      cells += `<div class="cal-cell day ${future ? 'future' : ''} ${sel ? 'sel' : ''}" ${future ? '' : `data-date="${iso}"`}>${d}</div>`;
    }
    wrap.innerHTML = `<div class="cal">
      <div class="cal-head"><button class="btn sm" id="prevM">‹</button>
        <b style="text-transform:capitalize">${monthName}</b>
        <button class="btn sm" id="nextM">›</button></div>
      <div class="cal-grid">${cells}</div></div>`;
    $('#prevM').onclick = () => { calMonth = new Date(y, m - 1, 1); paintCalendar(selDate); };
    $('#nextM').onclick = () => { calMonth = new Date(y, m + 1, 1); paintCalendar(selDate); };
    wrap.querySelectorAll('[data-date]').forEach((c) =>
      c.addEventListener('click', () => loadArchive(c.dataset.date)));
  }
  async function loadArchive(date) {
    paintCalendar(date);
    const res = $('#archResults');
    res.innerHTML = UI.loading('Buscando noticias del ' + date + '…');
    const list = await Api.byDate(date);
    res.innerHTML = `<h3 style="margin-bottom:12px">📅 ${UI.fmtDate(date)}</h3>` +
      (list.length ? UI.grid(list) : UI.empty('No hay noticias archivadas para esa fecha.', '🗄️'));
  }

  // ================= SETTINGS =================
  function renderSettings() {
    const s = Store.getSettings();
    const cats = CATS.length ? CATS : [];
    view.innerHTML = `
    <div class="page-head"><div class="page-title">⚙️ Configuración</div></div>
    <div class="settings">
      <div class="set-card">
        <h3>📂 Categorías visibles</h3>
        ${cats.map((c) => `
          <div class="set-row"><div class="label"><b>${c.icon} ${UI.esc(c.label)}</b>
            <small>${(c.subtopics || []).slice(0, 3).join(' · ')}${(c.subtopics || []).length > 3 ? '…' : ''}</small></div>
            <label class="switch"><input type="checkbox" data-cat="${c.id}" ${s.categories[c.id] !== false ? 'checked' : ''}/><span class="slider"></span></label>
          </div>`).join('')}
      </div>
      <div class="set-card">
        <h3>🎨 Apariencia y preferencias</h3>
        <div class="set-row"><div class="label"><b>Tema oscuro</b><small>Estilo Jarvis (recomendado)</small></div>
          <label class="switch"><input type="checkbox" id="theme" ${s.theme === 'dark' ? 'checked' : ''}/><span class="slider"></span></label></div>
        <div class="set-row"><div class="label"><b>Hora de actualización</b><small>Resumen diario</small></div>
          <input type="time" class="select" id="updateTime" value="${s.updateTime}"/></div>
        <div class="set-row"><div class="label"><b>Notificaciones</b><small>Alertas de noticias críticas</small></div>
          <label class="switch"><input type="checkbox" id="notif" ${s.notifications ? 'checked' : ''}/><span class="slider"></span></label></div>
        <div class="set-row"><div class="label"><b>Idioma</b><small>Interfaz</small></div>
          <select class="select" id="lang"><option value="es" ${s.language === 'es' ? 'selected' : ''}>Español</option>
          <option value="en" ${s.language === 'en' ? 'selected' : ''}>English</option></select></div>
      </div>
      <div class="set-card">
        <h3>ℹ️ Sobre la app</h3>
        <div class="set-row"><div class="label"><b>JARVIS NEWS</b><small>v1.0.0 — agregador inteligente de noticias</small></div></div>
        <div class="set-row"><div class="label"><b>Historial de lectura</b><small>${Store.getHistory().length} artículo(s) leído(s)</small></div></div>
        <div class="set-row"><div class="label"><b>Datos locales</b><small>Favoritos y preferencias en este navegador</small></div>
          <button class="btn" style="border-color:var(--danger);color:var(--danger)" id="clearData">🗑️ Borrar todo</button></div>
      </div>
    </div>`;

    view.querySelectorAll('[data-cat]').forEach((el) => el.addEventListener('change', () => {
      const cur = Store.getSettings(); cur.categories[el.dataset.cat] = el.checked;
      Store.saveSettings({ categories: cur.categories }); toast('Preferencia guardada');
    }));
    $('#theme').addEventListener('change', (e) => { Store.saveSettings({ theme: e.target.checked ? 'dark' : 'light' }); applyTheme(); toast('Tema actualizado'); });
    $('#updateTime').addEventListener('change', (e) => { Store.saveSettings({ updateTime: e.target.value }); toast('Hora guardada'); });
    $('#notif').addEventListener('change', (e) => {
      if (e.target.checked && 'Notification' in window) Notification.requestPermission();
      Store.saveSettings({ notifications: e.target.checked }); toast('Notificaciones ' + (e.target.checked ? 'activadas' : 'desactivadas'));
    });
    $('#lang').addEventListener('change', (e) => { Store.saveSettings({ language: e.target.value }); toast('Idioma guardado (UI en español por ahora)'); });
    $('#clearData').addEventListener('click', () => {
      if (confirm('¿Borrar favoritos, historial y preferencias de este navegador?')) { Store.clearAll(); toast('Datos borrados'); renderSettings(); }
    });
  }

  function applyTheme() {
    const s = Store.getSettings();
    document.body.classList.toggle('light', s.theme === 'light');
  }

  // ================= EVENTOS GLOBALES (delegacion) =================
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]');
    if (open) { location.hash = '#/article/' + encodeURIComponent(open.dataset.open); return; }

    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      e.preventDefault();
      const id = favBtn.dataset.fav;
      // Busca el articulo en caches conocidos.
      const pool = [...(cacheAll || []), ...Store.getFavorites()];
      let art = pool.find((a) => a.id === id);
      if (!art) { // detalle: reconstruye desde DOM si hace falta
        Api.article(id).then((a) => doFav(a, favBtn));
        return;
      }
      doFav(art, favBtn);
      return;
    }

    const share = e.target.closest('[data-share]');
    if (share) {
      const data = JSON.parse(share.dataset.share);
      if (navigator.share) navigator.share({ title: data.title, url: data.url }).catch(() => {});
      else { navigator.clipboard?.writeText(data.url || data.title); toast('Enlace copiado'); }
      return;
    }

    const routeBtn = e.target.closest('[data-route]');
    if (routeBtn) {
      // Desbloquea síntesis de voz en iOS (debe ocurrir en gesto de usuario)
      if (routeBtn.dataset.route === '#/chat' && JarvisVoice.isSupported()) {
        JarvisVoice.unlock();
      }
      location.hash = routeBtn.dataset.route;
    }
  });

  function doFav(article, btn) {
    const added = Store.toggleFavorite(article);
    toast(added ? '❤️ Guardado en favoritos' : 'Eliminado de favoritos');
    btn.classList.toggle('active', added);
    if (btn.textContent.includes('Favorito') || btn.textContent.includes('Guardado'))
      btn.textContent = added ? '❤️ Guardado' : '🤍 Favorito';
    else btn.textContent = added ? '❤️' : '🤍';
    if (location.hash === '#/favorites') renderFavorites();
  }

  $('#refreshBtn').addEventListener('click', async () => {
    toast('🔄 Actualizando desde las fuentes…');
    cacheAll = null;
    try { await Api.yesterday(true); } catch {}
    router();
    toast('✓ Noticias actualizadas');
  });

  // ================= BOOT =================
  async function boot() {
    runSplash();
    tickClock(); setInterval(tickClock, 1000);
    applyTheme();
    try { CATS = await Api.categories(); } catch { CATS = []; }
    window.addEventListener('hashchange', router);
    // Pinta footer con fuentes
    $('#footerSources').textContent = CATS.length ? CATS.map((c) => c.icon).join(' ') : '';
    router();
  }
  boot();
})();
