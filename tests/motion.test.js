import { test, after } from 'node:test';
import assert from 'node:assert/strict';

const oldDocument = globalThis.document;
const oldMatchMedia = globalThis.matchMedia;
const listeners = new Map();
const animations = [];
const elements = new Map(['card', 'card-tilt'].map(id => [id, {
  dataset: { face: 'front' },
  animate() {
    let finish;
    const finished = new Promise(resolve => { finish = resolve; });
    const animation = { finished, finish, cancel: finish };
    animations.push(animation);
    return animation;
  }
}]));
const preference = { matches: false, addEventListener(type, listener) { listeners.set(type, listener); } };
globalThis.matchMedia = () => preference;
globalThis.document = {
  hidden: false,
  getElementById: id => elements.get(id),
  addEventListener(type, listener) { listeners.set(type, listener); }
};
const { motion } = await import('../dist/motion.js');

after(() => {
  globalThis.document = oldDocument;
  globalThis.matchMedia = oldMatchMedia;
});

test('reverse flip leaves the back face visible while the lifted card is still settling', async () => {
  const start = animations.length;
  const turning = motion.flip(false);
  animations[start].finish();
  await Promise.resolve();
  assert.equal(elements.get('card').dataset.face, 'back');
  animations[start + 1].finish();
  await turning;
  assert.equal(elements.get('card').dataset.face, 'back');
});

test('reduced motion reveals the final face without waiting for an animation', { timeout: 1000 }, async () => {
  preference.matches = true;
  await motion.flip(true);
  assert.equal(elements.get('card').dataset.face, 'front');
  preference.matches = false;
});

test('enabling reduced motion settles an in-progress card action', { timeout: 1000 }, async () => {
  const turning = motion.flip(false);
  preference.matches = true;
  listeners.get('change')();
  await turning;
  assert.equal(elements.get('card').dataset.face, 'back');
  preference.matches = false;
});

test('backgrounding the page settles an in-progress card action', { timeout: 1000 }, async () => {
  const turning = motion.flip(true);
  document.hidden = true;
  listeners.get('visibilitychange')();
  await turning;
  assert.equal(elements.get('card').dataset.face, 'front');
  document.hidden = false;
});
