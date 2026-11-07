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
  let revealGeneration = 0;
  let opening = false;
  let openedDay;
  let openedId;

  const particles = document.getElementById('daily-particles');
  // Fixed trajectories avoid per-frame layout work and keep the burst repeatable.
  for (let index = 0; index < 40; index++) {
    const particle = document.createElement('i');
    const angle = index * 2.39996;
    const distance = 85 + (index % 7) * 19;
    particle.className = index % 3 === 0 ? 'daily-shard' : 'daily-dust';
    particle.style.setProperty('--flight-x', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--flight-y', `${Math.sin(angle) * distance}px`);
    particle.style.setProperty('--shard-turn', `${index * 41}deg`);
    particle.style.setProperty('--burst-delay', `${2.48 + (index % 5) * .015}s`);
    particles.append(particle);
  }

  function updateShine() {
    const daily = getDeck().daily;
    button.classList.toggle('daily-unrevealed', daily?.date !== localDay() || !daily.revealed);
  }

  function resetReveal() {
    clearTimeout(revealTimer);
    revealGeneration++;
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
      openedDay = getDeck().daily.date;
      openedId = id;
      updateShine();
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
    const generation = ++revealGeneration;
    const finish = () => {
      if (generation !== revealGeneration || !dialog.open) return;
      stage.classList.add('is-revealed');
      const deck = refresh();
      deck.revealDaily(openedDay, openedId);
      persist();
      updateShine();
      message.textContent = 'Let the image speak to you.';
      dialog.querySelector('.daily-front').setAttribute('aria-hidden', 'false');
      dialog.querySelector('.daily-back').setAttribute('aria-hidden', 'true');
      source.hidden = false;
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else {
      const animation = dialog.querySelector('.daily-flipper').getAnimations()[0];
      if (animation) animation.finished.then(finish).catch(() => {});
      else revealTimer = setTimeout(finish, 4000);
    }
  });

  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
    if (event.matches && stage.classList.contains('is-revealing')) {
      for (const animation of stage.getAnimations({ subtree: true })) {
        try { animation.finish(); } catch { animation.cancel(); }
      }
    }
  });

  document.getElementById('daily-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', resetReveal);
  updateShine();
  button.disabled = false;
  button.addEventListener('click', open);
  const prompt = () => {
    updateShine();
    if (document.visibilityState === 'visible' && getDeck().daily?.date !== localDay()) open();
  };
  // Check again after midnight or when returning to a background tab.
  setTimeout(prompt, 2800);
  setInterval(prompt, 60000);
  document.addEventListener('visibilitychange', prompt);
}
