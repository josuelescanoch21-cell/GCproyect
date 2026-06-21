// Autenticación global del Portal GC (modo demo local)
// Mantiene la sesión entre todas las páginas HTML usando localStorage.
const GC_AUTH_ACCOUNTS_KEY = 'gc_portal_accounts_v2';
const GC_AUTH_SESSION_KEY = 'gc_portal_session_v2';

const DEFAULT_ACCOUNTS = {
  'admin@ong.pe':  { pass:'admin123',  nombre:'Ana García',   rol:'admin',  avatar:'👑' },
  'editor@ong.pe': { pass:'editor123', nombre:'Luis Paredes', rol:'editor', avatar:'✏️' },
  'lector@ong.pe': { pass:'lector123', nombre:'María Torres', rol:'lector', avatar:'👁' }
};

function getAccounts(){
  const stored = JSON.parse(localStorage.getItem(GC_AUTH_ACCOUNTS_KEY) || '{}');
  const merged = { ...DEFAULT_ACCOUNTS, ...stored };
  localStorage.setItem(GC_AUTH_ACCOUNTS_KEY, JSON.stringify(merged));
  return merged;
}

function saveAccounts(accounts){ localStorage.setItem(GC_AUTH_ACCOUNTS_KEY, JSON.stringify(accounts)); }
function getSession(){ return JSON.parse(localStorage.getItem(GC_AUTH_SESSION_KEY) || 'null'); }
function setSession(session){ localStorage.setItem(GC_AUTH_SESSION_KEY, JSON.stringify(session)); }
function clearSession(){ localStorage.removeItem(GC_AUTH_SESSION_KEY); }
function pagePrefix(){ return location.pathname.includes('/pages/') ? '../' : ''; }
function roleLabel(role){ return ({admin:'Administrador', editor:'Editor', lector:'Lector'}[role] || 'Usuario'); }
function canManage(){ const s = getSession(); return !!s && ['admin','editor'].includes(s.rol); }
function isAdmin(){ const s = getSession(); return !!s && s.rol === 'admin'; }

function signIn(email, password){
  const accounts = getAccounts();
  const u = accounts[email];
  if(!u || u.pass !== password) throw new Error('Usuario o contraseña incorrectos.');
  const session = { email, nombre:u.nombre, rol:u.rol, avatar:u.avatar, loggedAt:new Date().toISOString() };
  setSession(session);
  document.dispatchEvent(new CustomEvent('gc-auth-change', { detail: session }));
  return session;
}

function signUp({ nombre, email, password }){
  const accounts = getAccounts();
  if(accounts[email]) throw new Error('Ya existe una cuenta con ese correo.');
  accounts[email] = { pass:password, nombre:nombre || email.split('@')[0], rol:'lector', avatar:'👤' };
  saveAccounts(accounts);
  return signIn(email, password);
}

function signOut(){
  clearSession();
  document.dispatchEvent(new CustomEvent('gc-auth-change'));
  location.reload();
}

function renderAuthModal(){
  if(document.getElementById('gcAuthModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="gc-auth-modal hidden" id="gcAuthModal" aria-hidden="true">
      <div class="gc-auth-card">
        <button class="gc-auth-close" id="gcAuthClose" type="button">×</button>
        <div class="gc-auth-head">
          <div class="gc-auth-icon">🌐</div>
          <div>
            <h2>Acceso al Portal GC</h2>
            <p>Inicia sesión para mantener tu usuario activo en todas las páginas.</p>
          </div>
        </div>
        <div class="gc-auth-tabs">
          <button class="active" data-auth-tab="login">Iniciar sesión</button>
          <button data-auth-tab="register">Registrarme</button>
        </div>
        <div id="gcAuthNotice"></div>
        <form id="gcLoginForm" class="gc-auth-form">
          <label>Correo</label>
          <input type="email" id="gcLoginEmail" placeholder="admin@ong.pe" required>
          <label>Contraseña</label>
          <input type="password" id="gcLoginPassword" placeholder="••••••••" required>
          <button type="submit">Entrar</button>
          <details class="gc-demo-box">
            <summary>Cuentas de ejemplo</summary>
            <button type="button" data-demo="admin@ong.pe|admin123">👑 Administrador</button>
            <button type="button" data-demo="editor@ong.pe|editor123">✏️ Editor</button>
            <button type="button" data-demo="lector@ong.pe|lector123">👁 Lector</button>
          </details>
        </form>
        <form id="gcRegisterForm" class="gc-auth-form hidden">
          <label>Nombre</label>
          <input type="text" id="gcRegName" placeholder="Tu nombre" required>
          <label>Correo</label>
          <input type="email" id="gcRegEmail" placeholder="correo@ong.pe" required>
          <label>Contraseña</label>
          <input type="password" id="gcRegPassword" placeholder="Mínimo 6 caracteres" minlength="6" required>
          <button type="submit">Crear cuenta</button>
          <p class="gc-small-note">Las cuentas nuevas ingresan como Lector. Solo un Administrador puede gestionar el panel.</p>
        </form>
      </div>
    </div>`);

  const modal = document.getElementById('gcAuthModal');
  const notice = document.getElementById('gcAuthNotice');
  const showNotice = (msg, ok=false) => { notice.innerHTML = `<div class="gc-auth-notice ${ok?'ok':'err'}">${msg}</div>`; };

  document.getElementById('gcAuthClose').onclick = () => modal.classList.add('hidden');
  modal.addEventListener('click', e => { if(e.target === modal) modal.classList.add('hidden'); });

  document.querySelectorAll('[data-auth-tab]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const login = btn.dataset.authTab === 'login';
    document.getElementById('gcLoginForm').classList.toggle('hidden', !login);
    document.getElementById('gcRegisterForm').classList.toggle('hidden', login);
    notice.innerHTML = '';
  }));

  document.querySelectorAll('[data-demo]').forEach(btn => btn.addEventListener('click', () => {
    const [email, pass] = btn.dataset.demo.split('|');
    document.getElementById('gcLoginEmail').value = email;
    document.getElementById('gcLoginPassword').value = pass;
  }));

  document.getElementById('gcLoginForm').addEventListener('submit', e => {
    e.preventDefault();
    try {
      signIn(document.getElementById('gcLoginEmail').value.trim(), document.getElementById('gcLoginPassword').value);
      showNotice('Sesión iniciada correctamente.', true);
      setTimeout(() => location.reload(), 350);
    } catch(err){ showNotice(err.message); }
  });

  document.getElementById('gcRegisterForm').addEventListener('submit', e => {
    e.preventDefault();
    try {
      signUp({
        nombre: document.getElementById('gcRegName').value.trim(),
        email: document.getElementById('gcRegEmail').value.trim(),
        password: document.getElementById('gcRegPassword').value
      });
      showNotice('Cuenta creada correctamente.', true);
      setTimeout(() => location.reload(), 350);
    } catch(err){ showNotice(err.message); }
  });
}

function openAuthModal(){ renderAuthModal(); document.getElementById('gcAuthModal').classList.remove('hidden'); }

function renderSidebarSession(){
  const sidebar = document.querySelector('.sidebar');
  if(!sidebar) return;
  let box = document.getElementById('gcSessionBox');
  if(!box){
    box = document.createElement('div');
    box.id = 'gcSessionBox';
    box.className = 'gc-session-box';
    const footer = sidebar.querySelector('.sidebar-footer');
    sidebar.insertBefore(box, footer || null);
  }
  const session = getSession();
  if(session){
    box.innerHTML = `
      <div class="gc-session-user">
        <span class="gc-session-avatar">${session.avatar || '👤'}</span>
        <div><strong>${session.nombre}</strong><small>${roleLabel(session.rol)}</small></div>
      </div>
      <button type="button" class="gc-session-logout" id="gcLogoutBtn">Cerrar sesión</button>`;
    document.getElementById('gcLogoutBtn').onclick = signOut;
  } else {
    box.innerHTML = `
      <button type="button" class="gc-login-btn" id="gcOpenLogin">Iniciar sesión</button>
      <button type="button" class="gc-register-btn" id="gcOpenRegister">Registrarme</button>`;
    document.getElementById('gcOpenLogin').onclick = openAuthModal;
    document.getElementById('gcOpenRegister').onclick = () => { openAuthModal(); document.querySelector('[data-auth-tab="register"]').click(); };
  }
}

function applyGlobalPermissions(){
  const session = getSession();
  document.body.classList.toggle('is-logged-in', !!session);
  document.body.classList.toggle('is-admin', isAdmin());
  document.body.classList.toggle('can-manage', canManage());

  document.querySelectorAll('a[href$="admin.html"], a[href*="/admin.html"]').forEach(a => {
    a.style.display = isAdmin() ? '' : 'none';
  });

  document.querySelectorAll('[data-admin-only]').forEach(el => el.classList.toggle('hidden', !isAdmin()));
  document.querySelectorAll('[data-manage-only]').forEach(el => el.classList.toggle('hidden', !canManage()));

  if(location.pathname.endsWith('/admin.html') && !isAdmin()){
    const main = document.querySelector('.main');
    if(main){
      main.innerHTML = `<section class="auth-required-panel"><h2>Acceso restringido</h2><p>Este panel solo está disponible para cuentas con rol Administrador.</p><button id="restrictedLoginBtn">Iniciar sesión como administrador</button></section>`;
      document.getElementById('restrictedLoginBtn').onclick = openAuthModal;
    }
  }
}

function initAuth(){
  getAccounts();
  renderAuthModal();
  renderSidebarSession();
  applyGlobalPermissions();
}

document.addEventListener('DOMContentLoaded', initAuth);

window.GCAuth = { getSession, signIn, signUp, signOut, openAuthModal, canManage, isAdmin, roleLabel, getAccounts };
