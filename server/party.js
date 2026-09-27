import { PARTY } from '../shared/constants.js';

const toast = (p, text) => p.send({ t: 'toast', text });

// Player groups. They live in memory only: leaving the game leaves the party,
// and a party with one member left is disbanded. The rewards side (shared
// EXP, loot rights, pooled boss damage) is in GameRoom.
export class Parties {
  constructor(world) {
    this.world = world;
    this.all = new Set();
  }

  find(name) {
    return this.world.online.get(String(name ?? '').trim().toLowerCase()) ?? null;
  }

  invite(p, name, now) {
    const t = this.find(name);
    if (!t || t === p) return toast(p, 'ไม่พบผู้เล่นชื่อนี้ที่ออนไลน์อยู่');
    if (p.party && p.party.leader !== p) return toast(p, 'หัวหน้าปาร์ตี้เท่านั้นที่ชวนคนเพิ่มได้');
    if (p.party?.members.length >= PARTY.max) return toast(p, `ปาร์ตี้เต็มแล้ว (${PARTY.max} คน)`);
    if (t.party) return toast(p, `${t.profile.name} อยู่ในปาร์ตี้อื่นแล้ว`);
    t.invites ??= new Map();
    t.invites.set(p.key, now + PARTY.inviteMs);
    t.send({ t: 'party_invite', from: p.profile.name, lvl: p.profile.level });
    toast(p, `ส่งคำชวนถึง ${t.profile.name} แล้ว`);
  }

  accept(p, from, now) {
    const host = this.find(from);
    const until = host && p.invites?.get(host.key);
    if (host) p.invites?.delete(host.key);
    if (!until || now > until) return toast(p, 'คำชวนนี้หมดอายุแล้ว');
    if (p.party) return toast(p, 'ออกจากปาร์ตี้เดิมก่อนนะ');
    const party = host.party ?? this.create(host);
    if (party.members.length >= PARTY.max) return toast(p, 'ปาร์ตี้เต็มแล้ว');
    party.members.push(p);
    p.party = party;
    p.invites.clear();
    this.tell(party, `👥 ${p.profile.name} เข้าปาร์ตี้แล้ว`);
    this.sync(party);
  }

  decline(p, from) {
    const host = this.find(from);
    if (!host || !p.invites?.delete(host.key)) return;
    toast(host, `${p.profile.name} ปฏิเสธคำชวน`);
  }

  create(leader) {
    const party = { leader, members: [leader], sent: null };
    leader.party = party;
    this.all.add(party);
    return party;
  }

  leave(p, text = `👥 ${p.profile.name} ออกจากปาร์ตี้`) {
    const party = p.party;
    if (!party) return;
    party.members = party.members.filter((m) => m !== p);
    p.party = null;
    p.send({ t: 'party', party: null });
    if (party.members.length <= 1) {
      this.all.delete(party);
      for (const m of party.members) {
        m.party = null;
        m.send({ t: 'party', party: null });
        toast(m, 'ปาร์ตี้ยุบแล้ว');
      }
      return;
    }
    if (party.leader === p) party.leader = party.members[0];
    this.tell(party, text);
    this.sync(party);
  }

  kick(p, name) {
    const t = this.find(name);
    if (!p.party || p.party.leader !== p || !t || t === p || t.party !== p.party) return;
    this.leave(t, `👥 ${t.profile.name} ถูกเชิญออกจากปาร์ตี้`);
    toast(t, 'คุณถูกเชิญออกจากปาร์ตี้');
  }

  // Party chat reaches members in any room.
  chat(p, text) {
    if (!p.party) return toast(p, 'ยังไม่มีปาร์ตี้ — ชวนเพื่อนได้ที่ปุ่ม 👥');
    for (const m of p.party.members) m.send({ t: 'chat', id: p.id, name: p.profile.name, text, party: true });
  }

  tell(party, text) {
    for (const m of party.members) m.send({ t: 'sys', text });
  }

  view(party) {
    return {
      leader: party.leader.id,
      members: party.members.map((m) => ({
        id: m.id, name: m.profile.name, lvl: m.profile.level, room: m.roomId,
        hp: Math.max(0, Math.round(m.hp)), maxHp: m.stats.maxHp, dead: m.dead || undefined,
      })),
    };
  }

  // Send the member list (with HP and rooms) when anything in it changed.
  sync(party, force = true) {
    const view = this.view(party);
    const json = JSON.stringify(view);
    if (!force && json === party.sent) return;
    party.sent = json;
    for (const m of party.members) m.send({ t: 'party', party: view });
  }

  tick() {
    for (const party of this.all) this.sync(party, false);
  }
}
