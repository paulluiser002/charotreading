import test from 'node:test';
import assert from 'node:assert/strict';
import { Deck } from '../dist/deck.js';
import { localDay } from '../dist/daily.js';

test('daily card reserves an unseen card while preserving a held hand', () => {
  const deck = new Deck(['a', 'b', 'c', 'd', 'e', 'f'], null, () => 0);
  deck.drawHand(3);
  const hand = [...deck.hand];
  const eligible = [...deck.remaining];
  const id = deck.claimDaily('2026-11-06');
  assert.ok(eligible.includes(id));
  assert.deepEqual(deck.hand, hand);
  assert.ok(!deck.remaining.includes(id));
  const restored = new Deck(deck.ids, deck.snapshot());
  assert.equal(restored.claimDaily('2026-11-06'), id);
  restored.shuffle();
  restored.reset();
  assert.ok(!restored.remaining.includes(id));
  assert.deepEqual(restored.hand, hand);
});

test('daily never replenishes an exhausted deck and allows a claim after explicit reset', () => {
  const deck = new Deck(['a', 'b', 'c'], null, () => 0);
  const yesterday = deck.claimDaily('2026-11-05');
  while (deck.remaining.length) deck.draw();
  assert.equal(deck.claimDaily('2026-11-06'), null);
  assert.equal(deck.remaining.length, 0);
  deck.reset();
  const today = deck.claimDaily('2026-11-06');
  assert.ok(deck.ids.includes(today));
  assert.equal(deck.claimDaily('2026-11-06'), today);
  assert.ok(yesterday);
});

test('old progress migrates and the next date claims a different eligible card', () => {
  const deck = new Deck(['a', 'b', 'c'], null, () => 0);
  const saved = deck.snapshot();
  delete saved.daily;
  const migrated = new Deck(deck.ids, saved, () => 0);
  const first = migrated.claimDaily('2026-11-06');
  const second = migrated.claimDaily('2026-11-07');
  assert.notEqual(first, second);
  assert.equal(localDay(new Date(2026, 10, 6, 23, 59)), '2026-11-06');
  assert.equal(localDay(new Date(2026, 10, 7, 0, 0)), '2026-11-07');
});

test('daily reveal persists for today and resets on the next daily claim', () => {
  const deck = new Deck(['a', 'b', 'c'], null, () => 0);
  const id = deck.claimDaily('2026-11-06');
  deck.revealDaily('2026-11-05', id);
  assert.ok(!deck.daily.revealed);
  deck.revealDaily('2026-11-06', id);
  const restored = new Deck(deck.ids, deck.snapshot(), () => 0);
  assert.equal(restored.daily.revealed, true);
  assert.equal(restored.claimDaily('2026-11-06'), id);
  restored.claimDaily('2026-11-07');
  assert.ok(!restored.daily.revealed);
});
