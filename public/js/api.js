/* api.js — cliente de la API REST del backend. */
window.Api = (() => {
  const base = '';
  const get = async (path) => {
    const r = await fetch(base + path);
    if (!r.ok) throw new Error('API ' + r.status + ' ' + path);
    return r.json();
  };
  return {
    health:        ()        => get('/api/news/yesterday'),
    yesterday:     (refresh) => get('/api/news/yesterday' + (refresh ? '?refresh=1' : '')),
    today:         (refresh) => get('/api/news/today' + (refresh ? '?refresh=1' : '')),
    all:           (refresh) => get('/api/news/all' + (refresh ? '?refresh=1' : '')),
    category:      (id)      => get('/api/news/category/' + encodeURIComponent(id)),
    search:        (q)       => get('/api/news/search/' + encodeURIComponent(q)),
    byDate:        (d)       => get('/api/news/date/' + encodeURIComponent(d)),
    article:       (id)      => get('/api/news/' + encodeURIComponent(id)),
    categories:    ()        => get('/api/settings/categories'),
    jarvisGreeting:()        => get('/api/jarvis/greeting'),
    jarvisAsk:     (q)       => get('/api/jarvis?q=' + encodeURIComponent(q)),
  };
})();
