import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Deck } from '../dist/deck.js';

const root = new URL('../dist/', import.meta.url);
const cards = JSON.parse(await readFile(new URL('cards.json', root), 'utf8'));
assert.ok(cards.length >= 200, `Expected at least 200 cards; got ${cards.length}`);
const ids = new Set();
const images = new Set();
const hashes = new Set();
let totalBytes = 0;
for (const card of cards) {
  assert.ok(card.id && !ids.has(card.id), `Duplicate ID: ${card.id}`);
  assert.match(card.image, /^assets\/cards\/[a-zA-Z0-9_-]+\.(webp|jpg|png)$/);
  assert.ok(!images.has(card.image), `Repeated image path: ${card.image}`);
  const source = new URL(card.source);
  assert.equal(source.protocol, 'https:');
  assert.ok(source.hostname === 'pinterest.com' || source.hostname.endsWith('.pinterest.com'), `Invalid Pinterest source: ${source}`);
  assert.ok(typeof card.alt === 'string' && card.alt.trim(), `Missing alt text: ${card.id}`);
  const file = new URL(card.image, root);
  const bytes = await readFile(file);
  assert.ok(bytes.length > 500, `Empty/truncated image: ${file}`);
  if (card.image.endsWith('.webp')) {
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.ok(!hashes.has(hash), `Duplicate image content: ${card.id}`);
  if (card.sha256) assert.equal(hash, card.sha256, `Image hash mismatch: ${card.id}`);
  ids.add(card.id); images.add(card.image); hashes.add(hash);
  totalBytes += (await stat(file)).size;
}
const deck = new Deck([...ids]);
const drawn = new Set();
for (let i = 0; i < cards.length; i++) {
  const { id, newRound } = deck.draw();
  assert.equal(newRound, false);
  assert.ok(!drawn.has(id));
  drawn.add(id);
  deck.shuffle();
}
assert.equal(drawn.size, cards.length);
console.log(JSON.stringify({ cards: cards.length, uniqueImages: hashes.size, pinterestSources: cards.length, totalMegabytes: +(totalBytes / 1024 / 1024).toFixed(2), completeDeckWithoutRepeats: true }, null, 2));
