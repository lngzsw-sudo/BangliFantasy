import { NAME_RE, PASSWORD_MAX, PASSWORD_MIN } from '/shared/constants.js';
import { Net } from './net.js';
import { UI } from './ui.js';
import { WorldScene } from './WorldScene.js';

const $ = (sel) => document.querySelector(sel);

const net = new Net();
const ui = new UI(net);

// Start the renderer behind the login screen so the first `room` message
// always finds a ready scene.
const sceneReady = new Promise((resolve) => (ui.onSceneReady = resolve));
// Handy for debugging/e2e from the devtools console.
sceneReady.then((scene) => (window.__scene = scene));
const fontsReady = document.fonts?.load('13px Mitr').catch(() => {}) ?? Promise.resolve();
fontsReady.then(() => {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#1f1a24',
    pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: new WorldScene(net, ui),
  });
});

const form = $('#login-form');
const nameInput = $('#login-name');
const passInput = $('#login-pass');
const codeInput = $('#login-code');
const rememberBox = $('#login-remember');
const submit = $('#login-submit');
const err = $('#login-error');

// localStorage can throw (private mode, blocked storage): treat that as empty.
const storage = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {}
  },
};
const loadSession = () => {
  try {
    return JSON.parse(storage.get('bangli.session'));
  } catch {
    return null;
  }
};

const savedName = storage.get('bangli.name') ?? '';
nameInput.value = savedName;

// Modes: returning players land on "login", newcomers on "register";
// "recover" is the forgot-password form (name + recovery code + new password).
let mode = savedName ? 'login' : 'register';
function setMode(m) {
  mode = m;
  const recover = m === 'recover';
  for (const b of form.querySelectorAll('[data-mode]')) b.setAttribute('aria-selected', b.dataset.mode === m);
  codeInput.hidden = !recover;
  codeInput.required = recover;
  passInput.placeholder = recover ? 'รหัสผ่านใหม่' : 'รหัสผ่าน';
  passInput.autocomplete = m === 'login' ? 'current-password' : 'new-password';
  submit.textContent = { register: 'สร้างตัวละคร 🛵', login: 'เข้าตลาด 🛵', recover: 'ตั้งรหัสผ่านใหม่ 🔑' }[m];
  $('#login-hint').textContent = {
    register: `ตั้งชื่อตัวละครกับรหัสผ่าน (${PASSWORD_MIN} ตัวขึ้นไป) — ใช้ล็อกอินจากเครื่องไหนก็ได้`,
    login: 'ยังไม่มีตัวละคร? กด "สมัครใหม่"',
    recover: 'ใส่ชื่อตัวละครกับรหัสกู้คืนที่ได้ตอนสมัคร แล้วตั้งรหัสผ่านใหม่',
  }[m];
  $('#login-forgot').textContent = recover ? '← กลับไปเข้าสู่ระบบ' : 'ลืมรหัสผ่าน?';
  err.textContent = '';
}
for (const b of form.querySelectorAll('[data-mode]')) b.onclick = () => setMode(b.dataset.mode);
$('#login-forgot').onclick = () => setMode(mode === 'recover' ? 'login' : 'recover');
setMode(mode);

async function sendHello(hello) {
  submit.disabled = true;
  await sceneReady;
  net.handlers.delete('open');
  net.on('open', () => net.send('hello', hello));
  net.connect();
}

let loggedIn = false;
let autoLogin = false;
form.onsubmit = (ev) => {
  ev.preventDefault();
  const name = nameInput.value.trim();
  const password = passInput.value;
  if (!NAME_RE.test(name)) {
    err.textContent = 'ชื่อต้องยาว 2–16 ตัว ใช้ไทย/อังกฤษ/ตัวเลข/_ (ไม่มีเว้นวรรค)';
    return;
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    err.textContent = `รหัสผ่านต้องยาว ${PASSWORD_MIN}–${PASSWORD_MAX} ตัว`;
    return;
  }
  err.textContent = '';
  const hello = { name, password, mode, remember: rememberBox.checked };
  if (mode === 'recover') hello.code = codeInput.value;
  sendHello(hello);
};

function showLoginForm() {
  autoLogin = false;
  form.hidden = false;
  $('#login-auto').hidden = true;
  submit.disabled = false;
}

// Remembered device: skip the form and log straight in.
const remembered = loadSession();
if (remembered?.name && remembered?.token) {
  autoLogin = true;
  form.hidden = true;
  $('#login-auto').hidden = false;
  $('#login-auto-name').textContent = remembered.name;
  sendHello({ mode: 'session', name: remembered.name, session: remembered.token });
}

net.on('welcome', (m) => {
  loggedIn = true;
  passInput.value = '';
  codeInput.value = '';
  storage.set('bangli.name', m.me.name);
  storage.set('bangli.token', null); // left over from guest logins
  if (m.session) storage.set('bangli.session', JSON.stringify({ name: m.me.name, token: m.session }));
  $('#login').hidden = true;
  $('#hud').hidden = false;
  if (m.recoveryCode) ui.showRecoveryCode(m.recoveryCode);
});

net.on('error', (m) => {
  if (loggedIn) return ui.toast(m.text);
  if (m.code === 'session') storage.set('bangli.session', null);
  if (autoLogin) {
    showLoginForm();
    setMode('login');
  }
  err.textContent = m.text;
  submit.disabled = false;
});

net.on('close', () => {
  if (!loggedIn) {
    if (autoLogin) showLoginForm();
    submit.disabled = false;
    err.textContent ||= 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง';
    return;
  }
  $('#disconnected').hidden = false;
});

// Log out: forget this device on the server and locally, then start over.
ui.onLogout = () => {
  const s = loadSession();
  if (s?.token) net.send('logout', { session: s.token });
  storage.set('bangli.session', null);
  setTimeout(() => location.reload(), 200);
};

$('#reconnect').onclick = () => location.reload();
