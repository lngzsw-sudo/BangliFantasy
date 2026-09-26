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
const submit = $('#login-submit');
const err = $('#login-error');
let savedName = '';
try {
  savedName = localStorage.getItem('bangli.name') ?? '';
} catch {}
nameInput.value = savedName;

// Returning players land on "log in", newcomers on "register".
let mode = savedName ? 'login' : 'register';
function setMode(m) {
  mode = m;
  for (const b of form.querySelectorAll('[data-mode]')) b.setAttribute('aria-selected', b.dataset.mode === m);
  passInput.autocomplete = m === 'register' ? 'new-password' : 'current-password';
  submit.textContent = m === 'register' ? 'สร้างตัวละคร 🛵' : 'เข้าตลาด 🛵';
  $('#login-hint').textContent = m === 'register'
    ? `ตั้งชื่อตัวละครกับรหัสผ่าน (${PASSWORD_MIN} ตัวขึ้นไป) — ใช้ล็อกอินจากเครื่องไหนก็ได้`
    : 'ยังไม่มีตัวละคร? กด "สมัครใหม่"';
  err.textContent = '';
}
for (const b of form.querySelectorAll('[data-mode]')) b.onclick = () => setMode(b.dataset.mode);
setMode(mode);

let loggedIn = false;
form.onsubmit = async (ev) => {
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
  submit.disabled = true;
  await sceneReady;
  net.handlers.delete('open');
  net.on('open', () => net.send('hello', { name, password, mode }));
  net.connect();
};

net.on('welcome', (m) => {
  loggedIn = true;
  passInput.value = '';
  try {
    localStorage.setItem('bangli.name', m.me.name);
    localStorage.removeItem('bangli.token'); // left over from guest logins
  } catch {}
  $('#login').hidden = true;
  $('#hud').hidden = false;
});

net.on('error', (m) => {
  if (!loggedIn) {
    err.textContent = m.text;
    submit.disabled = false;
  } else {
    ui.toast(m.text);
  }
});

net.on('close', () => {
  if (!loggedIn) {
    submit.disabled = false;
    err.textContent ||= 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง';
    return;
  }
  $('#disconnected').hidden = false;
});

$('#reconnect').onclick = () => location.reload();
