import { test } from 'node:test';
import assert from 'node:assert/strict';

const setup = async (hostname, suffix) => {
  const scripts = [];
  globalThis.window = { location: { hostname } };
  globalThis.document = {
    createElement: () => ({}),
    head: { append: script => scripts.push(script) }
  };
  const analytics = await import(`../dist/analytics.js?test=${suffix}`);
  return { analytics, scripts, browser: window };
};

test('production configures the supplied GA property and queues reading events without waiting for Google', async () => {
  const { analytics, scripts, browser } = await setup('charot-readings.clearlemur16384.chatgpt.site', 'production');
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-XE6T7Y5VCY');
  assert.equal(scripts[0].async, true);
  assert.equal(browser.dataLayer[1][0], 'config');
  assert.equal(browser.dataLayer[1][1], 'G-XE6T7Y5VCY');
  analytics.track('draw_hand', { card_count: 3 });
  assert.deepEqual(Array.from(browser.dataLayer.at(-1)), ['event', 'draw_hand', { card_count: 3 }]);
});

test('local previews neither load Google nor record events', async () => {
  const { analytics, scripts, browser } = await setup('localhost', 'local');
  analytics.track('draw_hand', { card_count: 5 });
  assert.equal(scripts.length, 0);
  assert.equal(browser.dataLayer, undefined);
});

test('unavailable analytics cannot prevent a reading action', async () => {
  const { analytics, browser } = await setup('example.com', 'blocked');
  browser.gtag = () => { throw new Error('blocked'); };
  assert.doesNotThrow(() => analytics.track('next_reading'));
});
