import { Deck } from './deck.js';

const $ = id => document.getElementById(id);
const storageKey = 'charot-readings-deck-v1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let cards = [];
let byId = new Map();
let deck;
let busy = true;
let canSave = true;
let nativeFullscreen = false;

function setReadingFocus(enabled) {
  document.body.classList.toggle('reading-focus', enabled);
  $('fullscreen-button').setAttribute('aria-pressed', String(enabled));
  $('fullscreen-button').setAttribute('aria-label', enabled ? 'Exit fullscreen' : 'Enter fullscreen');
  $('fullscreen-button').querySelector('span').textContent = enabled ? 'Exit fullscreen' : 'Fullscreen';
  if (enabled) window.scrollTo(0, 0);
}

$('fullscreen-button').addEventListener('click', () => {
  if (document.body.classList.contains('reading-focus')) {
    setReadingFocus(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => setReadingFocus(true));
    }
    return;
  }
  setReadingFocus(true);
  // Do not block Exit while a browser's native fullscreen request is pending.
  if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }
});

document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    nativeFullscreen = true;
    if (!document.body.classList.contains('reading-focus')) {
      document.exitFullscreen().catch(() => setReadingFocus(true));
    }
  } else if (nativeFullscreen) {
    nativeFullscreen = false;
    setReadingFocus(false);
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.fullscreenElement && !document.querySelector('dialog[open]')) setReadingFocus(false);
});

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
  $('draw-button').disabled = value || !deck || deck.hand.length > 0;
  $('shuffle-button').disabled = value || !deck || deck.remaining.length < 2;
  $('clear-button').disabled = value || !deck?.current;
  $('reset-button').disabled = value || !deck;
  $('hand-size').disabled = value || !deck || deck.hand.length > 0;
  $('hand-button').disabled = value || !deck || !deck.hand.length;
  $('next-reading-button').disabled = value || !deck || !deck.hand.length;
  $('dialog-next-reading').disabled = value || !deck || !deck.hand.length;
  $('card-loading').hidden = !loading;
}

function render() {
  const current = byId.get(deck.current);
  $('card-back').hidden = Boolean(current);
  $('card-front').hidden = !current;
  $('pin-link').hidden = !current;
  if (current) {
    const image = $('card-image');
    if (image.getAttribute('src') !== current.image) image.src = current.image;
    image.alt = current.alt;
    $('card-number').textContent = `Card ${String(cards.indexOf(current) + 1).padStart(3, '0')}`;
    $('pin-link').href = current.source;
  } else {
    $('card-image').removeAttribute('src');
    $('card-image').alt = '';
  }
  $('hand-size').value = String(deck.handSize);
  $('draw-button').querySelector('span').textContent = deck.handSize === 1 ? 'Draw a card' : `Draw ${deck.handSize} cards`;
  $('hand-count').textContent = deck.hand.length;
  $('hand-button').setAttribute('aria-label', `Cards in hand (${deck.hand.length})`);
  $('hand-description').textContent = deck.hand.length
    ? 'Your cards are held until you select Next reading.'
    : 'Draw your hand before opening it for interpretation.';
  renderHand();
  if (!deck.hand.length && $('hand-dialog').open) $('hand-dialog').close();
}

function renderHand() {
  const fragment = document.createDocumentFragment();
  deck.hand.forEach((id, index) => {
    const card = byId.get(id);
    const item = document.createElement('figure');
    item.className = 'held-card';
    const label = document.createElement('figcaption');
    label.textContent = `Card ${index + 1}`;
    const image = document.createElement('img');
    image.src = card.image;
    image.alt = card.alt;
    image.decoding = 'async';
    const source = document.createElement('a');
    source.href = card.source;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = 'Image source';
    source.setAttribute('aria-label', `Image source for card ${index + 1}`);
    item.append(label, image, source);
    fragment.append(item);
  });
  $('hand-grid').replaceChildren(fragment);
  $('hand-summary').textContent = `${deck.hand.length} ${deck.hand.length === 1 ? 'card' : 'cards'}, held together for your interpretation.`;
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
  // Commit only after every image loads, so a failed request never consumes part of a hand.
  const draft = new Deck(cards.map(card => card.id), deck.snapshot());
  const result = draft.drawHand(deck.handSize);
  setBusy(true, true);
  status(deck.handSize === 1 ? 'Drawing your card…' : `Drawing your ${deck.handSize}-card hand…`);
  try {
    await Promise.all(result.ids.map(id => loadImage(byId.get(id).image)));
    await animate([{ transform: 'rotate(0)', opacity: 1 }, { transform: 'translateY(-9px) rotate(-4deg) scale(.97)', opacity: 0 }], 140);
    deck = draft;
    save();
    render();
    $('card-loading').hidden = true;
    await animate([{ transform: 'rotateY(-65deg) rotate(-3deg)', opacity: 0 }, { transform: 'rotateY(0) rotate(0)', opacity: 1 }], 340);
    status(!canSave ? 'Hand drawn. Progress can’t be saved in this browser.' : 'Your hand is ready. Open Cards in hand to begin your interpretation.');
  } catch {
    status('Your hand couldn’t load. No cards were used. Try drawing again.', true);
  } finally {
    setBusy(false);
  }
}

$('draw-button').addEventListener('click', draw);
$('hand-size').addEventListener('change', () => {
  if (busy || !deck || deck.hand.length) return;
  deck.handSize = Number($('hand-size').value);
  save();
  render();
});
$('hand-button').addEventListener('click', () => {
  if (!busy && deck?.hand.length) $('hand-dialog').showModal();
});
function nextReading() {
  if (busy || !deck?.hand.length) return;
  $('hand-dialog').close();
  deck.nextReading();
  save();
  render();
  status('Your hand has been released. Set an intention for your next reading.');
  setBusy(false);
}
$('next-reading-button').addEventListener('click', nextReading);
$('dialog-next-reading').addEventListener('click', nextReading);
$('return-to-deck').addEventListener('click', () => $('hand-dialog').close());
$('shuffle-button').addEventListener('click', async () => {
  if (busy || !deck) return;
  setBusy(true);
  deck.shuffle();
  save();
  await animate([{ transform: 'translateX(0) rotate(0)' }, { transform: 'translateX(-12px) rotate(-5deg)', offset: .3 }, { transform: 'translateX(12px) rotate(5deg)', offset: .65 }, { transform: 'translateX(0) rotate(0)' }], 380);
  status('The remaining cards have been shuffled.');
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
  status('Card hidden. It is still saved in Cards in hand.');
  setBusy(false);
});

$('reset-button').addEventListener('click', () => {
  if (busy || !deck) return;
  deck.reset();
  save();
  render();
  status(canSave ? (deck.hand.length ? 'History cleared. Your current hand is still held for interpretation.' : 'History cleared. Every card is available again.') : 'History cleared for this visit. Browser storage is unavailable.');
  setBusy(false);
});

for (const [button, dialog] of [['help-button', 'help-dialog'], ['credits-button', 'credits-dialog'], ['hand-button', 'hand-dialog']]) {
  const element = $(dialog);
  if (dialog !== 'hand-dialog') $(button).addEventListener('click', () => element.showModal());
  element.querySelector('.dialog-close').addEventListener('click', () => element.close());
  element.addEventListener('click', event => {
    const rect = element.getBoundingClientRect();
    if (event.target === element && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) element.close();
  });
}

async function init() {
  try {
    const response = await fetch('cards.json', { cache: 'no-cache', signal: AbortSignal.timeout(15000) });
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
    $('pool-count').textContent = `${cards.length} cards`;
    $('credits-summary').textContent = `${cards.length} photographic cards, selected for intuitive interpretation. Each image is linked to its source.`;
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
    status(deck.hand.length ? 'Welcome back. Your cards are still in hand.' : 'Take a breath. Draw when you are ready.');
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
