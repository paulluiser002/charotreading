export function localDay(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')].join('-');
}

export function initializeDaily({ cards, getDeck, isBusy, refresh, persist }) {
  const button = document.getElementById('daily-button');
  const dialog = document.getElementById('daily-dialog');
  const reveal = document.getElementById('daily-reveal');
  const image = document.getElementById('daily-image');
  const message = document.getElementById('daily-message');
  const stage = document.getElementById('daily-stage');
  const source = document.getElementById('daily-source');
  let revealTimer;
  let opening = false;

  function resetReveal() {
    clearTimeout(revealTimer);
    stage.classList.remove('is-revealing', 'is-revealed');
    reveal.setAttribute('aria-label', 'Reveal daily card');
    dialog.querySelector('.daily-front').setAttribute('aria-hidden', 'true');
    dialog.querySelector('.daily-back').setAttribute('aria-hidden', 'false');
    source.hidden = true;
  }

  async function open() {
    if (opening || isBusy() || document.querySelector('dialog[open]')) return;
    opening = true;
    try {
      const claim = () => {
        const deck = refresh();
        const id = deck.claimDaily(localDay());
        persist();
        return id;
      };
      const id = navigator.locks
        ? await navigator.locks.request('charot-daily-card', claim) : claim();
      resetReveal();
      reveal.disabled = true;
      stage.hidden = !id;
      const card = cards.find(card => card.id === id);
      message.textContent = card ? 'Preparing your card…' : 'All cards have been drawn. Reset history to begin a new cycle.';
      dialog.showModal();
      if (!card) return;
      image.src = card.image;
      image.alt = card.alt;
      source.href = card.source;
      try {
        await image.decode();
        if (!dialog.open) return;
        message.textContent = 'Tap the card to reveal.';
        reveal.disabled = false;
      } catch {
        message.textContent = 'Your card could not load. Close and reopen to try again.';
      }
    } finally {
      opening = false;
    }
  }

  reveal.addEventListener('click', () => {
    if (reveal.disabled) return;
    reveal.disabled = true;
    message.textContent = 'A moment of discovery…';
    stage.classList.add('is-revealing');
    const finish = () => {
      stage.classList.add('is-revealed');
      message.textContent = 'Let the image speak to you.';
      dialog.querySelector('.daily-front').setAttribute('aria-hidden', 'false');
      dialog.querySelector('.daily-back').setAttribute('aria-hidden', 'true');
      source.hidden = false;
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else revealTimer = setTimeout(finish, 3200);
  });

  document.getElementById('daily-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', resetReveal);
  button.disabled = false;
  button.addEventListener('click', open);
  const prompt = () => {
    if (document.visibilityState === 'visible' && getDeck().daily?.date !== localDay()) open();
  };
  // Check again after midnight or when returning to a background tab.
  setTimeout(prompt, 2800);
  setInterval(prompt, 60000);
  document.addEventListener('visibilitychange', prompt);
}
