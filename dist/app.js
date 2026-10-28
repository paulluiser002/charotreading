import { track } from './analytics.js';
import { Deck } from './deck.js?v=20261028-3';
import { motion } from './motion.js';

const $ = id => document.getElementById(id);
const storageKey = 'charot-readings-deck-v1';
let cards = [];
let byId = new Map();
let deck;
let busy = true;
let canSave = true;
let nativeFullscreen = false;

function setReadingFocus(enabled) {
  const changed = document.body.classList.contains('reading-focus') !== enabled;
  document.body.classList.toggle('reading-focus', enabled);
  $('fullscreen-button').setAttribute('aria-pressed', String(enabled));
  $('fullscreen-button').setAttribute('aria-label', enabled ? 'Exit fullscreen' : 'Enter fullscreen');
  $('fullscreen-button').querySelector('span').textContent = enabled ? 'Exit fullscreen' : 'Fullscreen';
  if (enabled) window.scrollTo(0, 0);
  if (changed) motion.pulse();
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
  if (value) motion.resetTilt();
  $('reading-controls').dataset.busy = String(value);
  $('deck-stage').setAttribute('aria-busy', String(value));
  $('draw-button').disabled = value || !deck || deck.hand.length > 0;
  $('shuffle-button').disabled = value || !deck || deck.remaining.length < 2;
  $('clear-button').disabled = value || !deck?.current;
  $('reset-button').disabled = value || !deck;
  $('hand-size').disabled = value || !deck || deck.hand.length > 0;
  $('hand-button').disabled = value || !deck || !deck.hand.length;
  $('next-reading-button').disabled = value || !deck || !deck.hand.length;
  $('dialog-next-reading').disabled = value || !deck || !deck.hand.length;
  $('hand-fan').disabled = value || !deck || deck.hand.length < 2;
  $('card-loading').hidden = !loading;
}

function render() {
  const current = byId.get(deck.current);
  $('card').dataset.face = current ? 'front' : 'back';
  $('card-back').setAttribute('aria-hidden', String(Boolean(current)));
  $('card-front').setAttribute('aria-hidden', String(!current));
  $('reading-controls').dataset.state = deck.hand.length ? 'held' : 'empty';
  $('reading-controls').dataset.size = String(deck.handSize);
  motion.scene(deck.hand.length);
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
    : 'Choose your cards, then draw to begin.';
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
    if (deck.handSize > 1) {
      const revealed = deck.revealed.includes(id);
      const flip = document.createElement('button');
      flip.type = 'button';
      flip.className = 'held-flip';
      flip.dataset.revealed = String(revealed);
      flip.setAttribute('aria-pressed', String(revealed));
      flip.setAttribute('aria-label', revealed ? `Card ${index + 1} revealed: ${card.alt}` : `Reveal card ${index + 1}`);
      const inner = document.createElement('span');
      inner.className = 'held-flip-inner';
      const back = document.createElement('span');
      back.className = 'held-flip-back';
      back.setAttribute('aria-hidden', 'true');
      const engraving = document.createElement('img');
      engraving.src = 'assets/oracle-back.svg';
      engraving.alt = '';
      engraving.draggable = false;
      back.append(engraving);
      const front = document.createElement('span');
      front.className = 'held-flip-front';
      front.setAttribute('aria-hidden', String(!revealed));
      front.append(image);
      inner.append(back, front);
      flip.append(inner);
      const hint = document.createElement('span');
      hint.className = 'held-flip-hint';
      hint.textContent = revealed ? 'Revealed' : 'Tap to reveal';
      source.style.visibility = revealed ? 'visible' : 'hidden';
      source.setAttribute('aria-hidden', String(!revealed));
      source.tabIndex = revealed ? 0 : -1;
      flip.addEventListener('click', () => {
        if (deck.revealed.includes(id)) return;
        deck.reveal(id);
        save();
        track('reveal_card', { card_count: deck.handSize, card_position: index + 1 });
        flip.dataset.revealed = 'true';
        flip.setAttribute('aria-pressed', 'true');
        flip.setAttribute('aria-label', `Card ${index + 1} revealed: ${card.alt}`);
        front.setAttribute('aria-hidden', 'false');
        source.style.visibility = 'visible';
        source.setAttribute('aria-hidden', 'false');
        source.tabIndex = 0;
        hint.textContent = 'Revealed';
      });
      item.append(label, flip, hint, source);
    } else {
      item.append(label, image, source);
    }
    fragment.append(item);
  });
  $('hand-grid').replaceChildren(fragment);
  $('hand-summary').textContent = deck.handSize > 1
    ? `${deck.hand.length} cards in your reading. Tap each card to reveal it when you are ready.`
    : 'One card, held for your interpretation.';
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
    image.onload = () => image.decode().then(() => finish(), () => finish(new Error('Image could not be decoded.')));
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
  } catch {
    status('Your hand couldn’t load. No cards were used. Try drawing again.', true);
    setBusy(false);
    return;
  }
  // Save the complete hand before motion begins, so a refresh during the deal is safe.
  deck = draft;
  save();
  track('draw_hand', { card_count: deck.handSize });
  $('card-loading').hidden = true;
  try {
    await motion.deal(deck.handSize);
    render();
    if (deck.handSize === 1) await Promise.all([motion.flip(true), motion.ready()]);
    else await motion.ready();
    status(!canSave ? 'Hand drawn. Progress can’t be saved in this browser.' : 'Your hand is ready. Open Cards in hand to begin your interpretation.');
  } finally {
    motion.cleanupDeal();
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
function openHand() {
  if (!busy && deck?.hand.length && !$('hand-dialog').open) {
    motion.open($('hand-dialog'));
    track('open_hand', { card_count: deck.handSize });
  }
}
$('hand-button').addEventListener('click', openHand);
$('hand-fan').addEventListener('click', openHand);
async function nextReading() {
  if (busy || !deck?.hand.length) return;
  setBusy(true);
  track('next_reading', { card_count: deck.handSize });
  deck.nextReading();
  save();
  try {
    await motion.close($('hand-dialog'));
    await motion.release();
    render();
    await motion.pulse();
    status('Your hand has been released. Set an intention for your next reading.');
  } finally {
    setBusy(false);
  }
}
$('next-reading-button').addEventListener('click', nextReading);
$('dialog-next-reading').addEventListener('click', nextReading);
$('return-to-deck').addEventListener('click', () => motion.close($('hand-dialog')));
$('shuffle-button').addEventListener('click', async () => {
  if (busy || !deck) return;
  setBusy(true);
  deck.shuffle();
  save();
  try {
    await motion.shuffle();
    status('The remaining cards have been shuffled.');
  } finally {
    setBusy(false);
  }
});
$('clear-button').addEventListener('click', async () => {
  if (busy || !deck?.current) return;
  setBusy(true);
  deck.clear();
  save();
  try {
    await motion.flip(false);
    render();
    status('Card hidden. It is still saved in Cards in hand.');
  } finally {
    setBusy(false);
  }
});

$('reset-button').addEventListener('click', async () => {
  if (busy || !deck) return;
  setBusy(true);
  deck.reset();
  save();
  render();
  try {
    await motion.pulse();
    status(canSave ? (deck.hand.length ? 'History cleared. Your current hand is still held for interpretation.' : 'History cleared. Every card is available again.') : 'History cleared for this visit. Browser storage is unavailable.');
  } finally {
    setBusy(false);
  }
});

for (const [button, dialog] of [['help-button', 'help-dialog'], ['credits-button', 'credits-dialog'], ['hand-button', 'hand-dialog'], ['coffee-button', 'coffee-dialog']]) {
  const element = $(dialog);
  if (dialog !== 'hand-dialog') $(button).addEventListener('click', () => {
    if (dialog === 'coffee-dialog') { resetCoffee(); track('open_support'); }
    motion.open(element);
  });
  element.querySelector('.dialog-close').addEventListener('click', () => motion.close(element));
  element.addEventListener('cancel', event => { event.preventDefault(); motion.close(element); });
  element.addEventListener('click', event => {
    const rect = element.getBoundingClientRect();
    if (event.target === element && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) motion.close(element);
  });
}

let copyTimer;
function resetCopy() {
  clearTimeout(copyTimer);
  $('copy-email').querySelector('span').textContent = 'Copy Email';
  $('copy-email').querySelector('use').setAttribute('href', '#copy-icon');
  $('copy-feedback').textContent = '';
}
function resetCoffee() {
  document.querySelector('input[name="support-option"][value="coffee"]').checked = true;
  $('coffee-donation').hidden = false;
  $('coffee-hire').hidden = true;
  resetCopy();
}
for (const input of document.querySelectorAll('input[name="support-option"]')) {
  input.addEventListener('change', () => {
    $('coffee-donation').hidden = input.value !== 'coffee';
    $('coffee-hire').hidden = input.value !== 'hire';
    if (input.value === 'hire') track('select_hire');
    resetCopy();
  });
}
$('contact-email').addEventListener('focus', event => event.target.select());
$('copy-email').addEventListener('click', async () => {
  resetCopy();
  try {
    await navigator.clipboard.writeText($('contact-email').value);
    $('copy-email').querySelector('span').textContent = 'Copied!';
    $('copy-email').querySelector('use').setAttribute('href', '#check-icon');
    $('copy-feedback').textContent = 'Copied!';
    copyTimer = setTimeout(resetCopy, 2200);
  } catch {
    $('copy-feedback').textContent = 'Couldn’t copy. Select the email address to copy it manually.';
  }
});
$('motion-toggle').addEventListener('click', () => {
  const paused = document.body.classList.toggle('motion-paused');
  $('motion-toggle').setAttribute('aria-pressed', String(paused));
  $('motion-toggle').textContent = paused ? 'Resume motion' : 'Pause motion';
});
document.addEventListener('visibilitychange', () => document.body.classList.toggle('page-hidden', document.hidden));
document.body.classList.toggle('page-hidden', document.hidden);

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

motion.initialize(() => busy);
init();
