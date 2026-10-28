import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Deck } from '../dist/deck.js';

const ids = Array.from({ length: 220 }, (_, i) => `card-${i}`);

test('every card appears once even with shuffles, clears, and reloads', () => {
  let deck = new Deck(ids);
  const seen = new Set();
  for (let i = 0; i < ids.length; i++) {
    const { id, newRound } = deck.draw();
    assert.equal(newRound, false);
    assert.equal(seen.has(id), false, `repeated ${id}`);
    seen.add(id);
    if (i % 3 === 0) deck.shuffle();
    if (i % 5 === 0) deck.clear();
    deck = new Deck(ids, JSON.parse(JSON.stringify(deck.snapshot())));
    assert.equal(deck.remaining.length, ids.length - i - 1);
  }
  assert.equal(seen.size, ids.length);
  const last = deck.last;
  const next = deck.draw();
  assert.equal(next.newRound, true);
  assert.notEqual(next.id, last);
  assert.equal(deck.remaining.length, ids.length - 1);
});

test('clearing hides the card without returning it to the deck', () => {
  const deck = new Deck(ids);
  deck.draw();
  deck.clear();
  assert.equal(deck.current, null);
  assert.equal(deck.remaining.length, 219);
});

test('invalid or outdated saved progress starts a valid fresh deck', () => {
  for (const state of [null, {}, { remaining: ['bogus'] }, { ids, remaining: [ids[0], ids[0]], current: null, last: null }]) {
    const deck = new Deck(ids, state);
    assert.equal(deck.remaining.length, ids.length);
    assert.equal(new Set(deck.remaining).size, ids.length);
  }
});
