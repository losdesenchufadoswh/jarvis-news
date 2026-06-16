/* ui.js — helpers de renderizado y formato. Devuelven strings HTML. */
window.UI = (() => {
  const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function timeAgo(iso) {
    const d = new Date(iso), now = new Date();
    const min = Math.round((now - d) / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} h`;
    const days = Math.round(h / 24);
    if (days <= 7) return `hace ${days} d`;
    return d.toLocaleDateString('es-PR', { day: '2-digit', month: 'short' });
  }

  function fmtDate(iso, withTime = false) {
    const o = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    if (withTime) { o.hour = '2-digit'; o.minute = '2-digit'; }
    return new Date(iso).toLocaleDateString('es-PR', o);
  }

  function stars(n) {
    const full = Math.round(n / 2);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  // Tarjeta de noticia.
  function card(a, { list = false } = {}) {
    const fav = window.Store.isFavorite(a.id);
    const img = a.imageUrl
      ? `<img class="card-thumb" src="${esc(a.imageUrl)}" alt="" loading="lazy" onerror="this.remove()" />`
      : '';
    return `
    <article class="card" style="--cat:${esc(a.color || '#D4AF37')}" data-id="${esc(a.id)}">
      <div class="card-top">
        <span class="card-cat">${a.icon || '📰'} ${esc(a.categoryLabel || a.category || '')}</span>
        <span class="card-imp" title="Importancia ${a.importance}/10">
          <span class="senti ${esc(a.sentiment || 'neutral')}"></span><b>${esc(a.importance ?? '')}</b>/10
        </span>
      </div>
      ${list ? '' : img}
      <h3 class="card-title" data-open="${esc(a.id)}">${esc(a.title)}</h3>
      <p class="card-desc">${esc(a.description || '')}</p>
      <div class="card-meta">
        <span class="src">${esc(a.source || 'Fuente')}</span>
        <span>•</span><span>${timeAgo(a.publishedAt)}</span>
      </div>
      <div class="card-actions">
        <button class="btn primary sm" data-open="${esc(a.id)}">Ver más ▶</button>
        <button class="btn fav sm ${fav ? 'active' : ''}" data-fav="${esc(a.id)}" title="Favorito">${fav ? '❤️' : '🤍'}</button>
        ${a.sourceUrl ? `<a class="btn ghost sm" href="${esc(a.sourceUrl)}" target="_blank" rel="noopener" title="Leer original">↗</a>` : ''}
      </div>
    </article>`;
  }

  function grid(articles, opts = {}) {
    if (!articles.length) return empty('Sin noticias aquí por ahora.', '📭');
    return `<div class="grid ${opts.list ? 'list' : ''}">${articles.map((a) => card(a, opts)).join('')}</div>`;
  }

  function section(catLabel, icon, articles) {
    if (!articles.length) return '';
    return `
    <section class="section">
      <div class="section-head"><span class="ico">${icon}</span><h2>${esc(catLabel)}</h2>
        <span class="count">${articles.length} noticia(s)</span></div>
      ${grid(articles)}
    </section>`;
  }

  function empty(msg, icon = '🛰️') {
    return `<div class="empty"><div class="big">${icon}</div><p>${esc(msg)}</p></div>`;
  }
  function loading(msg = 'Procesando datos…') {
    return `<div class="loading-state"><div class="spinner"></div><p>${esc(msg)}</p></div>`;
  }

  return { esc, timeAgo, fmtDate, stars, card, grid, section, empty, loading };
})();
