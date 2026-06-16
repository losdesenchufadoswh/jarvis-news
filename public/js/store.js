/* store.js — persistencia local (favoritos, historial, preferencias).
 * Usa localStorage. Para sincronizar con la nube ver README -> Migrar a Firebase. */
window.Store = (() => {
  const K = { fav: 'jarvis_favorites', hist: 'jarvis_history', set: 'jarvis_settings' };

  const read = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
    catch { return fallback; }
  };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const defaults = {
    categories: { energia: true, agua: true, economia: true, clima: true, tecnologia: true, puertorico: true, negocios: true, deportes: false },
    updateTime: '07:00',
    theme: 'dark',
    notifications: false,
    language: 'es',
  };

  return {
    // ---- Favoritos (guarda el articulo completo para verlo offline) ----
    getFavorites: () => read(K.fav, []),
    isFavorite: (id) => read(K.fav, []).some((a) => a.id === id),
    toggleFavorite(article) {
      const list = read(K.fav, []);
      const i = list.findIndex((a) => a.id === article.id);
      if (i >= 0) { list.splice(i, 1); write(K.fav, list); return false; }
      list.unshift({ ...article, savedAt: new Date().toISOString() });
      write(K.fav, list); return true;
    },
    removeFavorite(id) {
      write(K.fav, read(K.fav, []).filter((a) => a.id !== id));
    },

    // ---- Historial de lectura ----
    getHistory: () => read(K.hist, []),
    addHistory(article) {
      const list = read(K.hist, []).filter((a) => a.id !== article.id);
      list.unshift({ id: article.id, title: article.title, category: article.category, icon: article.icon, viewedAt: new Date().toISOString() });
      write(K.hist, list.slice(0, 200));
    },

    // ---- Preferencias ----
    getSettings: () => ({ ...defaults, ...read(K.set, {}) }),
    saveSettings(patch) {
      const next = { ...defaults, ...read(K.set, {}), ...patch };
      write(K.set, next); return next;
    },

    clearAll() { localStorage.removeItem(K.fav); localStorage.removeItem(K.hist); localStorage.removeItem(K.set); },
  };
})();
