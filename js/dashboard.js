import { getDocuments, getCategories, getAlerts, searchDocuments } from './data.js';

function statusClass(status) {
  if (status === 'vigente') return 'status-vigente';
  if (status === 'vencido') return 'status-vencido';
  return 'status-en-revision';
}

async function renderKpis() {
  const [docs, cats, alerts] = await Promise.all([getDocuments(), getCategories(), getAlerts()]);
  document.getElementById('kpiDocs').textContent = docs.length;
  document.getElementById('kpiCats').textContent = cats.length;
  document.getElementById('kpiAlerts').textContent = alerts.length;
  return { docs, cats, alerts };
}

function renderCategoryBars(docs, cats) {
  const counts = {};
  docs.forEach(d => {
    const name = d.categories?.name || 'Sin categoría';
    counts[name] = (counts[name] || 0) + 1;
  });
  const max = Math.max(1, ...Object.values(counts));
  const el = document.getElementById('categoryBars');
  el.innerHTML = Object.entries(counts).map(([name, count]) => `
    <div class="bar-row">
      <span class="name">${name}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div>
      <span class="count">${count}</span>
    </div>`).join('') || '<p style="color:var(--muted);font-size:13px;">Sin datos todavía.</p>';
}

function renderAlerts(alerts) {
  const el = document.getElementById('alertsList');
  if (!alerts.length) { el.innerHTML = '<p style="color:var(--muted);font-size:13px;">No hay vencimientos próximos.</p>'; return; }
  el.innerHTML = alerts.map(a => `
    <div class="alert-row">
      <span class="status-dot ${statusClass(a.status)} dot"></span>
      <div>
        <div class="t">${a.title}</div>
        <div class="d">${a.entidad} · vence en ${a.dias} días</div>
      </div>
    </div>`).join('');
}

function renderResults(results, query) {
  const el = document.getElementById('searchResults');
  if (!query) { el.innerHTML = ''; return; }
  if (!results.length) {
    el.innerHTML = `<div class="result-row"><div>
      <div class="title">Sin resultados para "${query}"</div>
      <div class="snippet">Esta búsqueda se registró automáticamente como brecha de información.</div>
    </div></div>`;
    return;
  }
  el.innerHTML = results.map(d => `
    <div class="result-row">
      <span class="status-dot ${statusClass(d.status)}"></span>
      <div style="flex:1;">
        <div class="title">${d.categories?.icon || '📄'} ${d.title}</div>
        <div class="snippet">${d.snippet || ''}</div>
        <div class="meta">
          <span>${d.entidad || ''}</span>
          ${(d.tags || []).map(t => `<span>${t}</span>`).join('')}
        </div>
      </div>
    </div>`).join('');
}

async function runSearch(query) {
  const results = await searchDocuments(query);
  renderResults(results, query);
}

function setupSearch() {
  const input = document.getElementById('searchInput');
  const btn = document.getElementById('searchBtn');
  btn.addEventListener('click', () => runSearch(input.value.trim()));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(input.value.trim()); });
  document.querySelectorAll('.quick-tags button').forEach(b => {
    b.addEventListener('click', () => { input.value = b.dataset.q; runSearch(b.dataset.q); });
  });
}

(async function init() {
  const { docs, cats, alerts } = await renderKpis();
  renderCategoryBars(docs, cats);
  renderAlerts(alerts);
  setupSearch();
})();
