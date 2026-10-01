import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FASHION_SLOTS, ITEMS, RECIPES, SHOPS } from '../shared/constants.js';
import { migrateProfile } from '../server/store.js';
import { join, makeWorld } from './helpers.js';

const last = (c, t) => c.inbox.filter((m) => m.t === t).at(-1);

test('props and pets are cosmetic slots, sold or crafted somewhere', () => {
  for (const slot of ['prop', 'pet']) assert.ok(FASHION_SLOTS.includes(slot));
  const sold = new Set([...Object.values(SHOPS).flatMap((s) => Object.keys(s)), ...Object.keys(RECIPES)]);
  for (const [id, item] of Object.entries(ITEMS)) {
    if (item.slot === 'prop' || item.slot === 'pet') assert.ok(sold.has(id), `${id} can be obtained`);
  }
});

test('buy a pet at the fair, take it along, everyone in the room sees it follow you', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'PetLover');
  const b = await join(world, 'Neighbour');
  const p = a.player();
  p.profile.coins = 1000;
  world.transfer(p, 'fair', 28, 5);
  world.transfer(b.player(), 'fair', 20, 6);
  a.client.message({ t: 'buy', npc: 'pets', item: 'pet_cat' });
  assert.equal(p.profile.inv.pet_cat, 1);
  assert.equal(p.profile.coins, 1000 - SHOPS.pets.pet_cat);
  a.client.message({ t: 'equip', item: 'pet_cat' });
  assert.equal(p.profile.equip.pet, 'pet_cat');
  assert.equal(last(b, 'look').pet, 'pet_cat');

  const c = await join(world, 'Latecomer');
  world.transfer(c.player(), 'fair', 20, 7);
  const view = last(c, 'room').ents.find((e) => e.id === a.id);
  assert.equal(view.pet, 'pet_cat');

  a.client.message({ t: 'unequip', slot: 'pet' });
  assert.equal(p.profile.equip.pet, null);
  assert.equal(last(b, 'look').pet, null);
});

test('props: buy the oliang bag at the café, craft the rattan basket at the tailor', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Shopper');
  const p = a.player();
  p.profile.coins = 500;
  world.transfer(p, 'market', 3, 3);
  a.client.message({ t: 'buy', npc: 'cafe', item: 'prop_oliang' });
  a.client.message({ t: 'equip', item: 'prop_oliang' });
  assert.equal(p.profile.equip.prop, 'prop_oliang');
  world.transfer(p, 'market', 12, 3);
  p.profile.inv.hyacinth = RECIPES.prop_basket.items.hyacinth;
  a.client.message({ t: 'craft', id: 'prop_basket' });
  assert.equal(p.profile.inv.prop_basket, 1);
  assert.equal(p.profile.equip.prop, 'prop_basket', 'crafting puts it on');
  assert.equal(p.profile.inv.hyacinth, 0);
});

test('accounts from before props and pets get the empty slots', () => {
  const old = { name: 'Oldtimer', level: 5, exp: 0, coins: 9, inv: {}, equip: { weapon: 'broom', body: 'vest_win', head: null } };
  const m = migrateProfile(old);
  assert.equal(m.equip.prop, null);
  assert.equal(m.equip.pet, null);
  assert.equal(m.equip.body, 'vest_win');
});
