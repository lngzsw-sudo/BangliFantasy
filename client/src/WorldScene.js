import { EMOTES, ITEMS, NPC_RANGE, TILE } from '/shared/constants.js';
import { ROOMS, roomSize, tileAt } from '/shared/maps.js';
import { MONSTER_ART } from './art.js';
import { TILE_VARIANTS, characterTexture, makeTextures, tileKey } from './textures.js';

export const FONT = '"Mitr", "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
const DPR = Math.min(2, window.devicePixelRatio || 1);
const WALK_FRAME_MS = 140;
const BUBBLE_MS = 5000;
const OBJECT_LABELS = { minigame: '🎴 เล่นมินิเกม', bounty: '📋 กระดานรับงาน' };

const text = (scene, x, y, str, style = {}) =>
  scene.add.text(x, y, str, {
    fontFamily: FONT, fontSize: '13px', color: '#ffffff',
    stroke: '#1f1a24', strokeThickness: 3, resolution: DPR, ...style,
  });

// Renders the current room and interpolates entities between server snapshots.
// The server is authoritative: this scene only sends intents (move/attack).
export class WorldScene extends Phaser.Scene {
  constructor(net, ui) {
    super('world');
    this.net = net;
    this.ui = ui;
    this.ents = new Map();
    this.meId = null;
    this.room = null;
    this.targetId = null;
    this.pending = null;
  }

  create() {
    makeTextures(this);
    this.S = this.pickScale();
    this.fxLayer = this.add.container(0, 0).setDepth(1e6);
    this.input.on('pointerdown', (pointer) => this.onPointer(pointer));
    this.scale.on('resize', () => {
      const s = this.pickScale();
      if (s !== this.S) {
        this.S = s;
        this.rebuild();
      }
    });
    const net = this.net;
    net.on('room', (m) => this.onRoom(m));
    net.on('join', (m) => this.addEntity(m.e));
    net.on('leave', (m) => this.removeEntity(m.id));
    net.on('s', (m) => this.onSnapshot(m.e));
    net.on('hit', (m) => this.onHit(m));
    net.on('die', (m) => this.onDie(m.id));
    net.on('gone', (m) => this.onGone(m));
    net.on('lvl', (m) => this.onLevel(m));
    net.on('look', (m) => this.onLook(m));
    net.on('chat', (m) => this.showBubble(m.id, m.text));
    net.on('emote', (m) => this.playEmote(m.id, m.e));
    net.on('fx', (m) => this.onFx(m));
    this.ui.sceneReady(this);
  }

  // Skip cosmetic tweens while the tab is hidden: Phaser pauses, so they'd
  // pile up during a long idle auto-farm session and all play at once.
  get fx() {
    return !document.hidden;
  }

  get T() {
    return TILE * this.S;
  }

  pickScale() {
    const { width, height } = this.scale;
    return Math.max(2, Math.min(5, Math.floor(Math.min(height / (TILE * 12), width / (TILE * 8)))));
  }

  // Tile coords -> pixel position of the tile centre.
  px(x) {
    return (x + 0.5) * this.T;
  }

  // ---------- room ----------

  onRoom(msg) {
    this.meId = msg.you;
    this.room = ROOMS[msg.room];
    this.targetId = null;
    this.pending = null;
    for (const id of [...this.ents.keys()]) this.removeEntity(id, true);
    this.snapshot = msg.ents;
    this.rebuild();
    for (const e of msg.ents) this.addEntity(e);
    this.snapCamera();
    this.ui.onRoom(this.room);
  }

  // (Re)draw the static map. Called on room change and when the scale changes.
  rebuild() {
    if (!this.room) return;
    this.mapLayer?.destroy();
    const { S, T } = this;
    const room = this.room;
    const { w, h } = roomSize(room);
    this.mapLayer = this.add.container(0, 0).setDepth(-1);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = tileAt(room, x, y);
        const v = (x * 7 + y * 13 + ((x * y) % 5)) % TILE_VARIANTS;
        this.mapLayer.add(this.add.image(x * T, y * T, tileKey(ch, room.theme, v)).setOrigin(0).setScale(S));
      }
    }
    for (const p of room.portals) {
      const cx = (p.x + p.w / 2) * T;
      const cy = (p.y + p.h / 2) * T;
      const glow = this.add.ellipse(cx, cy, p.w * T * 1.4, p.h * T, 0xc79bff, 0.35);
      this.tweens.add({ targets: glow, alpha: 0.1, duration: 900, yoyo: true, repeat: -1 });
      const label = text(this, cx, p.y * T - 4, p.label, { fontSize: '12px', color: '#e9d7ff' }).setOrigin(p.x === 0 ? 0 : 1, 1);
      if (p.x === 0) label.x = p.x * T;
      else label.x = (p.x + p.w) * T;
      this.mapLayer.add([glow, label]);
    }
    for (const o of room.objects) {
      const cx = (o.x + o.w / 2) * T;
      const icon = text(this, cx, o.y * T - 2, OBJECT_LABELS[o.kind] ?? o.name, { fontSize: '12px', color: '#ffe066' }).setOrigin(0.5, 1);
      this.tweens.add({ targets: icon, y: icon.y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.mapLayer.add(icon);
    }
    // Arrows pinned to the screen edge pointing at off-screen exits.
    this.portalMarks?.forEach((m) => m.destroy());
    this.portalMarks = room.portals.map((p) => {
      const arrow = text(this, 0, 0, '➜', { fontSize: '26px', color: '#e9d7ff' }).setOrigin(0.5);
      const label = text(this, 0, 16, ROOMS[p.to].name, { fontSize: '11px', color: '#e9d7ff' }).setOrigin(0.5, 0);
      const mark = this.add.container(0, 0, [arrow, label]).setScrollFactor(0).setDepth(2e6).setVisible(false);
      this.tweens.add({ targets: arrow, scale: 1.25, duration: 500, yoyo: true, repeat: -1 });
      return Object.assign(mark, { portal: p, arrow, label });
    });
    this.npcViews?.forEach((v) => v.destroy());
    this.npcViews = room.npcs.map((npc) => {
      const c = this.add.container(this.px(npc.x), this.feetY(npc.y)).setDepth(this.feetY(npc.y));
      const key = characterTexture(this, npc.look);
      c.add(this.add.image(0, 0, 'shadow').setScale(S).setOrigin(0.5, 0.5));
      c.add(this.add.image(0, 0, `${key}_0`).setOrigin(0.5, 1).setScale(S));
      c.add(text(this, 0, -16 * S - 2, npc.name, { fontSize: '11px', color: '#ffe066' }).setOrigin(0.5, 1));
      const bang = text(this, 0, -16 * S - 18, '💬', { fontSize: '14px' }).setOrigin(0.5, 1);
      this.tweens.add({ targets: bang, y: bang.y - 3, duration: 600, yoyo: true, repeat: -1 });
      c.add(bang);
      return c;
    });
    // Re-create entity views at the new scale.
    for (const ent of this.ents.values()) {
      ent.c.destroy();
      this.buildEntityView(ent);
    }
  }

  feetY(y) {
    return (y + 0.5) * this.T + this.T * 0.35;
  }

  // ---------- entities ----------

  addEntity(e) {
    if (this.ents.has(e.id)) this.removeEntity(e.id, true);
    const ent = { data: { ...e }, x: e.x, y: e.y, tx: e.x, ty: e.y, frame: 0, frameAt: 0, moving: false };
    this.ents.set(e.id, ent);
    this.buildEntityView(ent);
    if (e.id === this.meId) this.ui.onMe?.({ hp: e.hp, maxHp: e.maxHp });
  }

  buildEntityView(ent) {
    const { S } = this;
    const e = ent.data;
    const c = this.add.container(0, 0);
    ent.c = c;
    ent.rig = this.add.container(0, 0);
    if (e.k === 'd') {
      ent.body = this.add.image(0, 0, `drop_${e.item === 'coin' ? 'coin' : e.item}`).setScale(S);
      this.tweens.add({ targets: ent.body, y: -S * 2, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      ent.rig.add(ent.body);
      c.add(ent.rig);
      ent.headY = -6 * S;
    } else {
      c.add(this.add.image(0, 0, 'shadow').setScale(S));
      if (e.k === 'm') {
        const art = MONSTER_ART[e.type] ?? {};
        const scale = art.scale ?? 1;
        ent.body = this.add.image(0, 0, `${e.type}_0`).setOrigin(0.5, 1).setScale(S * scale);
        ent.rig.add(ent.body);
        ent.headY = -(art.headY ?? 11) * S * scale;
      } else {
        ent.texKey = characterTexture(this, e.look, e.body, e.head);
        ent.body = this.add.image(0, 0, `${ent.texKey}_0`).setOrigin(0.5, 1).setScale(S);
        ent.weapon = this.add.image(4.5 * S, -5 * S, 'shadow').setOrigin(0.5, 0.3).setScale(S);
        ent.rig.add([ent.body, ent.weapon]);
        this.setWeapon(ent, e.weapon);
        ent.headY = -16 * S;
      }
      c.add(ent.rig);
      ent.hpBar = this.add.graphics();
      c.add(ent.hpBar);
      const isMe = e.id === this.meId;
      const label = e.k === 'm' ? `${e.boss ? '👑 ' : ''}${e.name} Lv.${e.lvl}` : `Lv.${e.lvl} ${e.name}`;
      ent.label = text(this, 0, ent.headY - 7, label, {
        fontSize: '11px', color: e.k === 'm' ? '#ffb3b3' : isMe ? '#9ff0ff' : '#ffffff',
      }).setOrigin(0.5, 1);
      c.add(ent.label);
      ent.ring = this.add.ellipse(0, 0, 14 * S, 5 * S).setStrokeStyle(2, 0xff4d4d).setVisible(false);
      c.addAt(ent.ring, 0);
      this.drawHp(ent);
      this.setDir(ent, e.dir);
      if (e.dead) this.layDown(ent);
    }
    this.placeEntity(ent);
  }

  setWeapon(ent, weapon) {
    if (!ent.weapon) return;
    const ok = weapon && this.textures.exists(`weapon_${weapon}`);
    ent.weapon.setVisible(!!ok);
    if (ok) ent.weapon.setTexture(`weapon_${weapon}`);
  }

  setDir(ent, dir) {
    if (!dir || !ent.body) return;
    ent.data.dir = dir;
    const left = dir < 0;
    // Rats are drawn facing right; characters face the camera and only swap hands.
    ent.body.setFlipX(left);
    if (ent.weapon) {
      ent.weapon.setFlipX(left);
      ent.weapon.x = (left ? -4.5 : 4.5) * this.S;
    }
  }

  placeEntity(ent) {
    const x = this.px(ent.x);
    const y = ent.data.k === 'd' ? this.px(ent.y) : this.feetY(ent.y);
    ent.c.setPosition(x, y).setDepth(y);
  }

  drawHp(ent) {
    const g = ent.hpBar;
    if (!g) return;
    g.clear();
    const { hp, maxHp, k, id } = ent.data;
    const show = id === this.meId || hp < maxHp;
    if (!show || ent.data.dead) return;
    const w = (ent.data.boss ? 28 : 14) * this.S;
    const y = ent.headY - 5;
    g.fillStyle(0x1f1a24, 0.9).fillRect(-w / 2 - 1, y - 1, w + 2, 5);
    const color = k === 'm' ? 0xe0453a : id === this.meId ? 0x4ade80 : 0x60a5fa;
    g.fillStyle(color, 1).fillRect(-w / 2, y, Math.max(0, (w * hp) / maxHp), 3);
  }

  removeEntity(id, instant = false) {
    const ent = this.ents.get(id);
    if (!ent) return;
    this.ents.delete(id);
    ent.bubble?.destroy();
    if (instant || !this.fx) ent.c.destroy();
    else this.tweens.add({ targets: ent.c, alpha: 0, duration: 250, onComplete: () => ent.c.destroy() });
    if (this.targetId === id) this.targetId = null;
  }

  onSnapshot(list) {
    for (const [id, x, y, hp, dir] of list) {
      const ent = this.ents.get(id);
      if (!ent) continue;
      ent.tx = x;
      ent.ty = y;
      if (hp !== ent.data.hp) {
        ent.data.hp = hp;
        this.drawHp(ent);
        if (id === this.meId) this.ui.onMe?.({ hp, maxHp: ent.data.maxHp });
      }
      if (dir !== ent.data.dir) this.setDir(ent, dir);
    }
  }

  // ---------- combat feedback ----------

  onHit({ a, d, n, crit, miss, block, poison, wave }) {
    if (a === this.meId) this.setTarget(d);
    if (!this.fx) return;
    const attacker = this.ents.get(a);
    const target = this.ents.get(d);
    if (attacker?.rig && target) {
      const dx = Math.sign(target.x - attacker.x) || 1;
      this.tweens.add({ targets: attacker.rig, x: dx * this.S * 3, duration: 70, yoyo: true });
    }
    if (!target) return;
    if (miss) return this.floatText(d, 'MISS', '#c8c8c8');
    if (block) return this.floatText(d, 'BLOCK!', '#7cc7ff');
    const mine = d === this.meId;
    if (poison) return this.floatText(d, `☠${n}`, '#9be15d', 14);
    if (wave) this.floatText(d, `🌊${n}`, '#7cc7ff', 22);
    else this.floatText(d, crit ? `${n}!` : `${n}`, mine ? '#ff6b6b' : crit ? '#ffb020' : '#fff6a8', crit ? 22 : 16);
    if (target.body) {
      target.body.setTintFill(0xffffff);
      this.time.delayedCall(80, () => this.restoreTint(target));
    }
    if (mine) this.cameras.main.shake(80, 0.003);
  }

  setTarget(id) {
    if (this.targetId === id) return;
    const old = this.ents.get(this.targetId);
    old?.ring?.setVisible(false);
    this.targetId = id;
    this.ents.get(id)?.ring?.setVisible(true);
  }

  onDie(id) {
    const ent = this.ents.get(id);
    if (!ent) return;
    if (ent.data.k === 'm' && !this.fx) {
      this.removeEntity(id, true);
    } else if (ent.data.k === 'm') {
      this.tweens.add({ targets: ent.rig, angle: 90 * (ent.data.dir || 1), alpha: 0, y: -8, duration: 400 });
      this.time.delayedCall(420, () => this.removeEntity(id, true));
      if (this.targetId === id) this.targetId = null;
    } else {
      ent.data.dead = true;
      this.layDown(ent);
      this.drawHp(ent);
    }
  }

  layDown(ent) {
    ent.rig.setAngle(-90).setAlpha(0.7);
    ent.body.setTint(0x9a9a9a);
  }

  onGone({ id, by }) {
    const ent = this.ents.get(id);
    if (!ent) return;
    const picker = this.ents.get(by);
    if (by === this.meId) {
      const name = ent.data.item === 'coin' ? '🪙' : ITEMS[ent.data.item]?.icon ?? '';
      this.floatText(by, `+${ent.data.amount} ${name}`, '#ffe066', 14);
    }
    this.ents.delete(id);
    if (picker && this.fx) {
      this.tweens.add({
        targets: ent.c, x: picker.c.x, y: picker.c.y - 8 * this.S, alpha: 0, duration: 250,
        onComplete: () => ent.c.destroy(),
      });
    } else {
      ent.c.destroy();
    }
  }

  onLevel({ id, lvl, maxHp }) {
    const ent = this.ents.get(id);
    if (!ent) return;
    ent.data.lvl = lvl;
    ent.data.maxHp = maxHp;
    ent.data.hp = maxHp;
    ent.label.setText(`Lv.${lvl} ${ent.data.name}`);
    this.drawHp(ent);
    this.floatText(id, 'LEVEL UP!', '#9ff0ff', 20);
    if (!this.fx) return;
    const ring = this.add.ellipse(ent.c.x, ent.c.y, 10, 4, 0x9ff0ff, 0.6).setDepth(ent.c.depth - 1);
    this.tweens.add({ targets: ring, scaleX: 8, scaleY: 8, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
  }

  onLook({ id, body, head, weapon }) {
    const ent = this.ents.get(id);
    if (!ent || ent.data.k !== 'p') return;
    Object.assign(ent.data, { body, head, weapon });
    ent.texKey = characterTexture(this, ent.data.look, body, head);
    ent.body.setTexture(`${ent.texKey}_${ent.frame}`);
    this.setWeapon(ent, weapon);
    this.floatText(id, '✨', '#ffffff', 18);
  }

  // Status effects and boss telegraphs from the server.
  onFx({ id, fx, n, ms, r, label }) {
    const ent = this.ents.get(id);
    if (!ent || !this.fx) return;
    if (fx === 'heal') return this.floatText(id, `+${n}`, '#6dff8a');
    if (fx === 'slow' || fx === 'poison') {
      const [color, label] = fx === 'slow' ? [0x7cc7ff, '🌿 ช้าลง'] : [0x9be15d, '☠ ติดพิษ'];
      this.floatText(id, label, fx === 'slow' ? '#7cc7ff' : '#9be15d', 13);
      ent.statusTint = color;
      this.restoreTint(ent);
      clearTimeout(ent.tintTimer);
      ent.tintTimer = setTimeout(() => {
        ent.statusTint = null;
        this.restoreTint(ent);
      }, ms);
    }
    if (fx === 'charge') {
      this.floatText(id, '💢 พุ่งชน!', '#ff8a80', 18);
      this.tweens.add({ targets: ent.rig, angle: 8 * (ent.data.dir || 1), duration: 120, yoyo: true, repeat: 2 });
    }
    if (fx === 'wave') {
      // Growing ring = get out before it fills up.
      const radius = r * this.T;
      const ring = this.add.circle(ent.c.x, ent.c.y, radius, 0x5b93b3, 0.12).setStrokeStyle(3, 0x9cc8e0, 0.9);
      const fill = this.add.circle(ent.c.x, ent.c.y, 1, 0x5b93b3, 0.35);
      ring.setDepth(ent.c.depth - 1);
      fill.setDepth(ent.c.depth - 1);
      this.floatText(id, label ?? '🌊 น้ำกำลังทะลัก!', '#9cc8e0', 16);
      this.tweens.add({
        targets: fill, radius, duration: ms,
        onComplete: () => {
          this.cameras.main.shake(150, 0.006);
          this.tweens.add({ targets: [ring, fill], alpha: 0, duration: 300, onComplete: () => { ring.destroy(); fill.destroy(); } });
        },
      });
    }
  }

  restoreTint(ent) {
    if (!ent.body || ent.data.dead) return;
    if (ent.statusTint) ent.body.setTint(ent.statusTint);
    else ent.body.clearTint();
  }

  floatText(id, str, color, size = 16) {
    const ent = this.ents.get(id);
    if (!ent || !this.fx) return;
    const t = text(this, ent.c.x + (Math.random() - 0.5) * 16, ent.c.y + ent.headY - 16, str, {
      fontSize: `${size}px`, color, fontStyle: 'bold',
    }).setOrigin(0.5, 1);
    this.fxLayer.add(t);
    this.tweens.add({ targets: t, y: t.y - 28, alpha: 0, duration: 900, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  // ---------- social ----------

  showBubble(id, str) {
    const ent = this.ents.get(id);
    if (!ent || !this.fx) return;
    ent.bubble?.destroy();
    const pad = 6;
    const t = text(this, 0, 0, str, {
      fontSize: '13px', color: '#1f1a24', strokeThickness: 0,
      wordWrap: { width: 170, useAdvancedWrap: true }, align: 'center',
    }).setOrigin(0.5, 1);
    const w = t.width + pad * 2;
    const h = t.height + pad * 2;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.95).lineStyle(2, 0x1f1a24, 1);
    g.fillRoundedRect(-w / 2, -h, w, h, 8).strokeRoundedRect(-w / 2, -h, w, h, 8);
    g.fillTriangle(-5, -1, 5, -1, 0, 6).lineBetween(-5, 0, 0, 6).lineBetween(5, 0, 0, 6);
    t.y = -pad;
    const bubble = this.add.container(0, 0, [g, t]);
    this.fxLayer.add(bubble);
    ent.bubble = bubble;
    bubble.setScale(0.6);
    this.tweens.add({ targets: bubble, scale: 1, duration: 150, ease: 'Back.out' });
    this.time.delayedCall(BUBBLE_MS, () => {
      if (ent.bubble !== bubble) return;
      this.tweens.add({ targets: bubble, alpha: 0, duration: 250, onComplete: () => bubble.destroy() });
      ent.bubble = null;
    });
  }

  playEmote(id, e) {
    const ent = this.ents.get(id);
    if (!ent?.rig || !this.fx) return;
    this.floatText(id, EMOTES[e]?.icon ?? '', '#ffffff', 24);
    const rig = ent.rig;
    this.tweens.killTweensOf(rig);
    rig.setScale(1).setAngle(0).setPosition(0, 0);
    const reset = () => rig.setScale(1).setAngle(0).setPosition(0, 0);
    if (e === 'wai') this.tweens.add({ targets: rig, angle: 12 * (ent.data.dir || 1), duration: 300, yoyo: true, hold: 500, onComplete: reset });
    if (e === 'squat') this.tweens.add({ targets: rig, scaleY: 0.72, duration: 200, yoyo: true, hold: 1600, onComplete: reset });
    if (e === 'vroom') this.tweens.add({ targets: rig, x: 3 * this.S, duration: 50, yoyo: true, repeat: 12, onComplete: reset });
    if (e === 'dance') this.tweens.add({ targets: rig, angle: { from: -12, to: 12 }, duration: 220, yoyo: true, repeat: 5, onComplete: reset });
  }

  // ---------- input ----------

  onPointer(pointer) {
    if (!this.room || !this.meId) return;
    const wx = pointer.worldX / this.T - 0.5;
    const wy = pointer.worldY / this.T - 0.5;
    const tx = Math.round(wx);
    const ty = Math.round(wy);
    this.pending = null;

    // Monsters/drops first: forgiving radius for fat fingers.
    let best = null;
    let bestD = 0.9;
    for (const ent of this.ents.values()) {
      if (ent.data.k === 'p') continue;
      const cy = ent.data.k === 'm' ? ent.y - 0.2 : ent.y;
      const d = Math.hypot(ent.x - wx, cy - wy);
      if (d < bestD) [best, bestD] = [ent, d];
    }
    if (best?.data.k === 'm') {
      this.setTarget(best.data.id);
      return this.net.send('attack', { id: best.data.id });
    }
    if (best?.data.k === 'd') {
      this.showMarker(best.x, best.y);
      return this.net.send('move', { x: Math.round(best.x), y: Math.round(best.y) });
    }

    const npc = this.room.npcs.find((n) => n.x === tx && (n.y === ty || n.y === ty + 1));
    if (npc) return this.walkAndInteract({ kind: 'npc', ref: npc, x: npc.x, y: npc.y + 1, cx: npc.x, cy: npc.y });
    const obj = this.room.objects.find((o) => tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h);
    if (obj) {
      return this.walkAndInteract({ kind: 'object', ref: obj, x: obj.x + obj.w, y: obj.y, cx: obj.x + obj.w / 2 - 0.5, cy: obj.y + obj.h / 2 - 0.5 });
    }

    this.setTarget(null);
    this.showMarker(tx, ty);
    this.net.send('move', { x: tx, y: ty });
  }

  // Used by the travel panel: walk onto the exit leading to another room.
  walkToPortal(portal) {
    this.pending = null;
    this.setTarget(null);
    this.showMarker(portal.x, portal.y);
    this.net.send('move', { x: portal.x, y: portal.y });
  }

  updatePortalMarks() {
    const cam = this.cameras.main;
    for (const mark of this.portalMarks ?? []) {
      const p = mark.portal;
      const sx = (p.x + p.w / 2) * this.T - cam.scrollX;
      const sy = (p.y + p.h / 2) * this.T - cam.scrollY;
      const inside = sx > 0 && sx < cam.width && sy > 0 && sy < cam.height;
      mark.setVisible(!inside);
      if (inside) continue;
      // Keep clear of the HUD at the top and the buttons/chat at the bottom.
      const x = Phaser.Math.Clamp(sx, 30, cam.width - 30);
      const y = Phaser.Math.Clamp(sy, 130, cam.height - 290);
      mark.setPosition(x, y);
      mark.arrow.setRotation(Math.atan2(sy - y, sx - x));
      const right = x > cam.width / 2;
      mark.label.setOrigin(right ? 1 : 0, 0).setX(right ? 12 : -12);
    }
  }

  walkAndInteract(p) {
    this.pending = p;
    const me = this.ents.get(this.meId);
    if (me && Math.hypot(me.x - p.cx, me.y - p.cy) <= NPC_RANGE - 0.3) return this.interact(p);
    this.showMarker(p.x, p.y);
    this.net.send('move', { x: p.x, y: p.y });
  }

  interact(p) {
    this.pending = null;
    if (p.kind === 'npc') this.ui.openNpc(p.ref);
    else if (p.ref.kind === 'bounty') this.ui.openPanel({ kind: 'bounty' });
    else this.ui.openMinigame();
  }

  showMarker(x, y) {
    const m = this.add.ellipse(this.px(x), this.px(y) + this.T * 0.3, this.T * 0.8, this.T * 0.35).setStrokeStyle(2, 0xffffff, 0.9);
    m.setDepth(0);
    this.tweens.add({ targets: m, scale: 0.3, alpha: 0, duration: 450, onComplete: () => m.destroy() });
  }

  // ---------- frame loop ----------

  update(time, delta) {
    const dt = delta / 1000;
    const k = Math.min(1, dt * 12);
    for (const ent of this.ents.values()) {
      const dx = ent.tx - ent.x;
      const dy = ent.ty - ent.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        ent.x = ent.tx;
        ent.y = ent.ty;
      } else {
        ent.x += dx * k;
        ent.y += dy * k;
      }
      ent.moving = d > 0.03;
      if (ent.body && ent.data.k !== 'd' && !ent.data.dead) {
        if (ent.moving && time - ent.frameAt > WALK_FRAME_MS) {
          ent.frame ^= 1;
          ent.frameAt = time;
        } else if (!ent.moving) {
          ent.frame = 0;
        }
        const key = ent.data.k === 'm' ? `${ent.data.type}_${ent.frame}` : `${ent.texKey}_${ent.frame}`;
        if (ent.body.texture.key !== key) ent.body.setTexture(key);
      }
      this.placeEntity(ent);
      if (ent.bubble) ent.bubble.setPosition(ent.c.x, ent.c.y + ent.headY - 20);
    }

    const me = this.ents.get(this.meId);
    if (me && this.pending && Math.hypot(me.x - this.pending.cx, me.y - this.pending.cy) <= NPC_RANGE - 0.3) {
      this.interact(this.pending);
    }
    this.followCamera(dt);
    this.updatePortalMarks();
  }

  followCamera(dt, snap = false) {
    const me = this.ents.get(this.meId);
    if (!me || !this.room) return;
    const cam = this.cameras.main;
    const { w, h } = roomSize(this.room);
    const axis = (pos, size, view) =>
      size <= view ? (size - view) / 2 : Math.max(0, Math.min(size - view, pos - view / 2));
    const sx = axis(me.c.x, w * this.T, cam.width);
    const sy = axis(me.c.y, h * this.T, cam.height);
    const k = snap ? 1 : Math.min(1, dt * 8);
    cam.scrollX += (sx - cam.scrollX) * k;
    cam.scrollY += (sy - cam.scrollY) * k;
  }

  snapCamera() {
    this.followCamera(0, true);
  }

  me() {
    return this.ents.get(this.meId);
  }
}
