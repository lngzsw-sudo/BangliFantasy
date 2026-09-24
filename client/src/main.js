import { NAME_RE } from '/shared/constants.js';
import { Net } from './net.js';
import { UI } from './ui.js';
import { WorldScene } from './WorldScene.js';

const $ = (sel) => document.querySelector(sel);

function token() {
  try {
    let t = localStorage.getItem('bangli.token');
    if (!t) {
      t = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('bangli.token', t);
    }
    return t;
  } catch {
    // Private mode etc.: a per-tab identity still lets you play.
    return (window.__bangliToken ??= crypto.randomUUID().replace(/-/g, ''));
  }
}

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
const err = $('#login-error');
try {
  nameInput.value = localStorage.getItem('bangli.name') ?? '';
} catch {}

let loggedIn = false;
form.onsubmit = async (ev) => {
  ev.preventDefault();
  const name = nameInput.value.trim();
  if (!NAME_RE.test(name)) {
    err.textContent = 'ชื่อต้องยาว 2–16 ตัว ใช้ไทย/อังกฤษ/ตัวเลข/_ (ไม่มีเว้นวรรค)';
    return;
  }
  err.textContent = '';
  form.querySelector('button').disabled = true;
  await sceneReady;
  net.handlers.delete('open');
  net.on('open', () => net.send('hello', { name, token: token() }));
  net.connect();
  try {
    localStorage.setItem('bangli.name', name);
  } catch {}
};

net.on('welcome', () => {
  loggedIn = true;
  $('#login').hidden = true;
  $('#hud').hidden = false;
});

net.on('error', (m) => {
  if (!loggedIn) {
    err.textContent = m.text;
    form.querySelector('button').disabled = false;
  } else {
    ui.toast(m.text);
  }
});

net.on('close', () => {
  if (!loggedIn) {
    form.querySelector('button').disabled = false;
    err.textContent ||= 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง';
    return;
  }
  $('#disconnected').hidden = false;
});

$('#reconnect').onclick = () => location.reload();
