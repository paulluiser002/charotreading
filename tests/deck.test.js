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

test('reset restores every card and forgets the displayed and last drawn card across reloads', () => {
  const deck = new Deck(ids);
  const previous = deck.draw().id;
  deck.draw();
  deck.reset();
  assert.equal(deck.current, null);
  assert.equal(deck.last, null);
  assert.equal(deck.remaining.length, ids.length);
  assert.ok(deck.remaining.includes(previous));
  const restored = new Deck(ids, JSON.parse(JSON.stringify(deck.snapshot())));
  const drawn = new Set(Array.from({ length: ids.length }, () => restored.draw().id));
  assert.equal(drawn.size, ids.length);
  assert.ok(drawn.has(previous));
});

test('three- and five-card hands survive reload, clear, and shuffle until the next reading', () => {
  for (const size of [3, 5]) {
    let deck = new Deck(ids);
    const { ids: held } = deck.drawHand(size);
    assert.equal(held.length, size);
    assert.equal(new Set(held).size, size);
    deck.clear();
    deck.shuffle();
    deck = new Deck(ids, JSON.parse(JSON.stringify(deck.snapshot())));
    assert.deepEqual(deck.hand, held);
    assert.equal(deck.handSize, size);
    assert.throws(() => deck.drawHand(size), /Next reading/);
    const remaining = [...deck.remaining];
    deck.nextReading();
    assert.deepEqual(deck.hand, []);
    assert.deepEqual(deck.remaining, remaining);
    const next = deck.drawHand(size).ids;
    assert.ok(next.every(id => !held.includes(id)));
  }
});

test('a hand stays unique when it crosses the end of the deck', () => {
  const smallIds = ['a', 'b', 'c', 'd', 'e', 'f'];
  const deck = new Deck(smallIds);
  for (let i = 0; i < 4; i++) deck.draw();
  const result = deck.drawHand(5);
  assert.equal(result.newRound, true);
  assert.equal(new Set(result.ids).size, 5);
  assert.ok(result.ids.every(id => !deck.remaining.includes(id)));
  const restored = new Deck(smallIds, JSON.parse(JSON.stringify(deck.snapshot())));
  assert.deepEqual(restored.hand, result.ids);
});

test('history reset preserves held cards until Next reading', () => {
  const deck = new Deck(ids);
  const held = deck.drawHand(3).ids;
  deck.reset();
  assert.deepEqual(deck.hand, held);
  assert.equal(deck.remaining.length, ids.length - held.length);
  assert.ok(held.every(id => !deck.remaining.includes(id)));
  deck.nextReading();
  assert.deepEqual(deck.hand, []);
});

test('invalid hand size and undersized decks do not consume cards', () => {
  const deck = new Deck(['a', 'b', 'c']);
  const before = deck.snapshot();
  assert.throws(() => deck.drawHand(4), /1, 3, or 5/);
  assert.throws(() => deck.drawHand(5), /enough cards/);
  assert.deepEqual(deck.snapshot(), before);
});

test('existing single-card progress is migrated into a held single-card reading', () => {
  const oldState = { ids: ['a', 'b', 'c'], remaining: ['b', 'c'], current: 'a', last: 'a' };
  const deck = new Deck(oldState.ids, oldState);
  assert.deepEqual(deck.hand, ['a']);
  assert.equal(deck.handSize, 1);
  assert.deepEqual(deck.remaining, ['b', 'c']);
});

test('a corrupt saved hand cannot introduce duplicates into a reading', () => {
  const deck = new Deck(ids);
  deck.drawHand(3);
  const state = deck.snapshot();
  state.hand[1] = state.hand[0];
  const restored = new Deck(ids, state);
  assert.deepEqual(restored.hand, []);
  assert.equal(restored.remaining.length, ids.length);
});
