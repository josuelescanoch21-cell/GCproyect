// ===== MOCK SEARCH DATA =====
const KNOWLEDGE_BASE = [
  {
    id: 1,
    title: "Ley N° 28882 — Ley de las Organizaciones No Gubernamentales",
    category: "Marco Legal y Normativo",
    tags: ["#ley", "#vigente", "#APCI"],
    snippet: "Regula la constitución, registro obligatorio, funcionamiento y supervisión de las ONGs que reciben cooperación técnica internacional.",
    entidad: "APCI",
    fecha: "2024-03-01"
  },
  {
    id: 2,
    title: "Guía de Inscripción APCI — Paso a Paso",
    category: "Marco Legal y Normativo",
    tags: ["#manual", "#vigente", "#APCI"],
    snippet: "Proceso completo de inscripción en la Agencia Peruana de Cooperación Internacional para ONGs que reciben fondos del exterior.",
    entidad: "APCI",
    fecha: "2024-06-15"
  },
  {
    id: 3,
    title: "Manual del Voluntario — Inducción y Protocolo",
    category: "Recursos Humanos y Voluntariado",
    tags: ["#manual", "#interno", "#publico"],
    snippet: "Guía completa para nuevos voluntarios: misión, visión, código de conducta, estructura organizacional y primeros pasos.",
    entidad: "RRHH Interno",
    fecha: "2025-01-10"
  },
  {
    id: 4,
    title: "Ley N° 29733 — Protección de Datos Personales",
    category: "Marco Legal y Normativo",
    tags: ["#ley", "#vigente", "#MINJUSDH"],
    snippet: "Obligaciones de la ONG al gestionar datos de beneficiarios, voluntarios y donantes. Consentimiento y seguridad de datos.",
    entidad: "MINJUSDH",
    fecha: "2024-01-01"
  },
  {
    id: 5,
    title: "Modelo de Estatutos para ONG — Plantilla Notarial",
    category: "Constitución y Gobierno",
    tags: ["#plantilla", "#interno", "#SUNARP"],
    snippet: "Documento fundacional tipo que define misión, visión, objetivos, estructura orgánica, patrimonio y normas de funcionamiento.",
    entidad: "SUNARP",
    fecha: "2024-09-20"
  },
  {
    id: 6,
    title: "Plantilla de Rendición de Cuentas — Donantes USAID",
    category: "Gestión de Proyectos y Fondos",
    tags: ["#plantilla", "#informe", "#interno"],
    snippet: "Formato estándar para rendición financiera ante donantes internacionales. Incluye cuadros presupuestales y narrativas.",
    entidad: "USAID",
    fecha: "2025-03-05"
  },
  {
    id: 7,
    title: "Proceso de Constitución Legal de una ONG en el Perú — 8 Pasos",
    category: "Constitución y Gobierno",
    tags: ["#manual", "#SUNARP", "#SUNAT", "#APCI"],
    snippet: "Guía completa del proceso: estatutos, escritura pública, SUNARP, RUC, APCI, cuenta bancaria, convenios e informes anuales.",
    entidad: "Múltiple",
    fecha: "2024-11-30"
  },
  {
    id: 8,
    title: "Ley N° 27806 — Transparencia y Acceso a la Información",
    category: "Marco Legal y Normativo",
    tags: ["#ley", "#vigente", "#PCM"],
    snippet: "Aplica a ONGs que reciben fondos públicos; obliga a publicar información sobre uso de recursos.",
    entidad: "PCM / Defensoría",
    fecha: "2024-01-01"
  },
  {
    id: 9,
    title: "Marco Lógico — Plantilla para Proyectos de Desarrollo",
    category: "Gestión de Proyectos y Fondos",
    tags: ["#plantilla", "#planificacion", "#ejecucion"],
    snippet: "Herramienta de planificación de proyectos con objetivo general, específicos, resultados, actividades e indicadores verificables.",
    entidad: "Interno",
    fecha: "2025-05-12"
  },
  {
    id: 10,
    title: "Caso de Éxito: Programa de Inclusión Educativa Huancavelica 2024",
    category: "Conocimiento Institucional",
    tags: ["#caso-de-exito", "#infancia", "#comunidad-rural", "#educacion"],
    snippet: "Sistematización de la experiencia del programa que benefició a 1,200 niños en zonas rurales de Huancavelica durante 2024.",
    entidad: "Interno",
    fecha: "2025-01-20"
  }
];

const SUGGESTIONS_MAP = {
  "ley": ["Ley N° 28882 — ONGs", "Ley N° 29733 — Datos Personales", "Ley N° 27806 — Transparencia"],
  "apci": ["Guía de Inscripción APCI", "Informe Anual APCI", "Registro ONG ante APCI"],
  "voluntar": ["Manual del Voluntario", "Protocolo de Inducción", "Evaluación de Voluntarios"],
  "estatuto": ["Modelo de Estatutos ONG", "Minuta y Escritura Pública", "Reforma de Estatutos"],
  "rendicion": ["Rendición de Cuentas USAID", "Formato Rendición APCI", "Auditoría Financiera"],
  "sunat": ["Exoneración SUNAT — Art. 19 LIR", "RUC para ONGs", "Declaración Jurada Anual"],
  "sunarp": ["Inscripción SUNARP", "Personería Jurídica", "Registro de Estatutos"],
  "manual": ["Manual del Voluntario", "Manual del Directorio", "Manual de Procedimientos"],
  "proyecto": ["Marco Lógico", "Ciclo de Proyecto", "Informe Final de Proyecto"],
  "constitucion": ["Proceso de Constitución — 8 Pasos", "Modelo de Estatutos", "Escritura Pública"],
  "convenio": ["Registro de Convenios APCI", "Convenio GIZ", "Modelo de Convenio USAID"],
  "datos": ["Ley 29733 — Protección de Datos", "Política de Privacidad", "Gestión de Beneficiarios"]
};

// ===== SEARCH LOGIC =====
function doSearch() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const resultsDiv = document.getElementById('searchResults');
  document.getElementById('suggestions').classList.add('hidden');

  if (!query) {
    resultsDiv.classList.add('hidden');
    return;
  }

  const results = KNOWLEDGE_BASE.filter(item =>
    item.title.toLowerCase().includes(query) ||
    item.snippet.toLowerCase().includes(query) ||
    item.tags.some(t => t.includes(query)) ||
    item.category.toLowerCase().includes(query) ||
    item.entidad.toLowerCase().includes(query)
  );

  resultsDiv.classList.remove('hidden');

  if (results.length === 0) {
    resultsDiv.innerHTML = `
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;color:#92400e;">
        <strong>🔍 Sin resultados para "${query}"</strong>
        <p style="font-size:13px;margin-top:4px;">Esta búsqueda se registra automáticamente para el análisis de brechas de conocimiento (Fase 2 — CirrusSearch). El administrador recibirá una alerta y creará el artículo correspondiente.</p>
      </div>`;
    return;
  }

  resultsDiv.innerHTML = `<p style="font-size:13px;color:#6b7280;margin-bottom:12px;">
    <strong>${results.length}</strong> resultado(s) encontrado(s) para "<em>${query}</em>" — <span style="color:#0e9f6e">⚡ &lt;200ms</span>
  </p>` + results.map(item => `
    <div class="result-item">
      <div class="result-title">📄 ${item.title}</div>
      <div class="result-snippet">${item.snippet}</div>
      <div class="result-meta">
        <span class="tag">📂 ${item.category}</span>
        <span class="tag">🏛 ${item.entidad}</span>
        ${item.tags.map(t => `<span class="tag">${t}</span>`).join('')}
        <span style="font-size:11px;color:#9ca3af;margin-left:auto;">📅 ${item.fecha}</span>
      </div>
    </div>
  `).join('');
}

// ===== AUTOCOMPLETE =====
function setupAutocomplete() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  const suggestionsDiv = document.getElementById('suggestions');

  input.addEventListener('input', function () {
    const val = this.value.toLowerCase().trim();
    if (val.length < 2) { suggestionsDiv.classList.add('hidden'); return; }

    const matches = [];
    for (const [key, values] of Object.entries(SUGGESTIONS_MAP)) {
      if (key.startsWith(val) || val.includes(key)) {
        values.forEach(v => matches.push(v));
      }
    }

    // Also match from knowledge base
    KNOWLEDGE_BASE.forEach(item => {
      if (item.title.toLowerCase().includes(val) && !matches.includes(item.title)) {
        matches.push(item.title);
      }
    });

    if (matches.length === 0) { suggestionsDiv.classList.add('hidden'); return; }

    suggestionsDiv.classList.remove('hidden');
    suggestionsDiv.innerHTML = matches.slice(0, 6).map(m => `
      <div class="suggestion-item" onclick="setSearch('${m.replace(/'/g, "\\'")}')">
        <span class="suggestion-icon">🔍</span> ${m}
      </div>
    `).join('');
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') doSearch();
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.search-box-wrapper')) {
      suggestionsDiv.classList.add('hidden');
    }
  });
}

function setSearch(text) {
  const input = document.getElementById('searchInput');
  if (input) {
    input.value = text;
    document.getElementById('suggestions').classList.add('hidden');
    doSearch();
  }
}

document.addEventListener('DOMContentLoaded', setupAutocomplete);
