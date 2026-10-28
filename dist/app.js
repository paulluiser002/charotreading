import { Deck } from './deck.js';

const $ = id => document.getElementById(id);
const storageKey = 'charot-readings-deck-v1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let cards = [];
let byId = new Map();
let deck;
let busy = true;
let canSave = true;

function savedProgress() {
  try { return JSON.parse(localStorage.getItem(storageKey)); }
  catch { return null; }
}

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(deck.snapshot())); }
  catch { canSave = false; }
}

function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}

function setBusy(value, loading = false) {
  busy = value;
  $('deck-stage').setAttribute('aria-busy', String(value));
  $('draw-button').disabled = value || !deck;
  $('shuffle-button').disabled = value || !deck || deck.remaining.length < 2;
  $('clear-button').disabled = value || !deck?.current;
  $('card-loading').hidden = !loading;
}

function render() {
  const current = byId.get(deck.current);
  $('card-back').hidden = Boolean(current);
  $('card-front').hidden = !current;
  $('pin-link').hidden = !current;
  if (current) {
    const image = $('meme-image');
    if (image.getAttribute('src') !== current.image) image.src = current.image;
    image.alt = current.alt;
    $('card-number').textContent = `#${String(cards.indexOf(current) + 1).padStart(3, '0')}`;
    $('pin-link').href = current.source;
  } else {
    $('meme-image').removeAttribute('src');
    $('meme-image').alt = '';
  }
  const drawn = cards.length - deck.remaining.length;
  $('remaining-count').textContent = deck.remaining.length;
  $('drawn-count').textContent = `${drawn} drawn`;
  $('progress-fill').style.width = `${drawn / cards.length * 100}%`;
  $('progress-bar').setAttribute('aria-valuemax', String(cards.length));
  $('progress-bar').setAttribute('aria-valuenow', String(drawn));
  $('deck-progress').hidden = false;
}

async function animate(frames, duration = 240) {
  if (reducedMotion.matches) return;
  await $('card').animate(frames, { duration, easing: 'cubic-bezier(.2,.7,.25,1)' }).finished.catch(() => {});
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => finish(new Error('Image load timed out.')), 12000);
    function finish(error) {
      clearTimeout(timer);
      image.onload = image.onerror = null;
      if (error) reject(error); else resolve();
    }
    image.onload = () => finish();
    image.onerror = () => finish(new Error('Image unavailable.'));
    image.src = src;
  });
}

async function draw() {
  if (busy || !deck) return;
  // Only commit a draw after its image loads, so a failed request never consumes a card.
  const draft = new Deck(cards.map(card => card.id), deck.snapshot());
  const result = draft.draw();
  setBusy(true, true);
  status('Sandali, may chismis ang universe…');
  try {
    await loadImage(byId.get(result.id).image);
    await animate([{ transform: 'rotate(0)', opacity: 1 }, { transform: 'translateY(-9px) rotate(-4deg) scale(.97)', opacity: 0 }], 140);
    deck = draft;
    save();
    render();
    $('card-loading').hidden = true;
    await animate([{ transform: 'rotateY(-65deg) rotate(-3deg)', opacity: 0 }, { transform: 'rotateY(0) rotate(0)', opacity: 1 }], 340);
    status(!canSave ? 'Card drawn. Progress can’t be saved in this browser.' : result.newRound ? 'Whole deck seen! Fresh round, fresh kalokohan.' : 'May tinamaan ba? The universe said what it said.');
  } catch {
    status('This card couldn’t load. Tap Draw a card to try again.', true);
  } finally {
    setBusy(false);
  }
}

$('draw-button').addEventListener('click', draw);
$('shuffle-button').addEventListener('click', async () => {
  if (busy || !deck) return;
  setBusy(true);
  deck.shuffle();
  save();
  await animate([{ transform: 'translateX(0) rotate(0)' }, { transform: 'translateX(-12px) rotate(-5deg)', offset: .3 }, { transform: 'translateX(12px) rotate(5deg)', offset: .65 }, { transform: 'translateX(0) rotate(0)' }], 380);
  status('Deck shuffled. Same question, new energy.');
  setBusy(false);
});
$('clear-button').addEventListener('click', async () => {
  if (busy || !deck?.current) return;
  setBusy(true);
  await animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(10px)' }], 140);
  deck.clear();
  save();
  render();
  await animate([{ opacity: 0 }, { opacity: 1 }], 180);
  status('Clean slate. Your next plot twist is one draw away.');
  setBusy(false);
});

for (const [button, dialog] of [['help-button', 'help-dialog'], ['credits-button', 'credits-dialog']]) {
  const element = $(dialog);
  $(button).addEventListener('click', () => element.showModal());
  element.querySelector('.dialog-close').addEventListener('click', () => element.close());
  element.addEventListener('click', event => {
    const rect = element.getBoundingClientRect();
    if (event.target === element && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) element.close();
  });
}

async function init() {
  try {
    const response = await fetch('cards.json', { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Deck unavailable.');
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error('Empty deck.');
    const ids = new Set();
    cards = data.map(card => {
      const url = new URL(card.source);
      if (!card.id || ids.has(card.id) || !/^assets\/cards\/[a-zA-Z0-9_-]+\.(webp|jpg|png)$/.test(card.image)
        || url.protocol !== 'https:' || !(url.hostname === 'pinterest.com' || url.hostname.endsWith('.pinterest.com'))
        || typeof card.alt !== 'string') throw new Error('Invalid card.');
      ids.add(card.id);
      return card;
    });
    byId = new Map(cards.map(card => [card.id, card]));
    deck = new Deck([...ids], savedProgress());
    $('pool-count').textContent = `${cards.length} cards of`;
    $('credits-summary').textContent = `${cards.length} distinct meme images, collected from public Pinterest pins. Every card has a source link.`;
    const sources = new Map();
    for (const card of cards) {
      if (!sources.has(card.source)) sources.set(card.source, card.alt);
    }
    const fragment = document.createDocumentFragment();
    let n = 0;
    for (const [url] of sources) {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `Card ${++n}`;
      fragment.append(link);
    }
    $('source-list').replaceChildren(fragment);
    render();
    if (deck.current) await loadImage(byId.get(deck.current).image);
    status(deck.current ? 'Welcome back. The universe kept your place.' : 'Your next plot twist is one draw away.');
    setBusy(false);
  } catch {
    status('The deck couldn’t load. Tap Retry to reconnect.', true);
    $('draw-button').querySelector('span').textContent = 'Retry';
    $('draw-button').disabled = false;
    $('draw-button').removeEventListener('click', draw);
    $('draw-button').addEventListener('click', () => location.reload(), { once: true });
    $('deck-stage').setAttribute('aria-busy', 'false');
  }
}

// Other tabs can pick up progress when idle, avoiding repeats during ordinary tab switching.
addEventListener('storage', event => {
  if (event.key === storageKey && deck && !busy) {
    deck = new Deck(cards.map(card => card.id), savedProgress());
    render();
    setBusy(false);
  }
});

init();
