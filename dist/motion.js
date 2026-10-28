const $ = id => document.getElementById(id);
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const active = new Set();
const ease = 'cubic-bezier(.16,1,.3,1)';

async function play(element, frames, options = {}) {
  if (!element || preference.matches || document.hidden || !element.animate) return;
  let animation;
  try {
    animation = element.animate(frames, { duration: 420, easing: ease, ...options });
    active.add(animation);
    await animation.finished;
  } catch {
    // Interrupted visual effects must never interrupt a saved reading.
  } finally {
    active.delete(animation);
  }
}

function finish() {
  for (const animation of active) {
    try { animation.finish(); } catch { animation.cancel(); }
  }
}
preference.addEventListener('change', () => { if (preference.matches) finish(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });

function fanTransform(index, count) {
  const position = index - (count - 1) / 2;
  return `translate3d(${position * 18}px,0,${index * 2}px) rotateZ(${position * 8}deg) scale(.86)`;
}

export const motion = {
  resetTilt() {
    $('card-tilt').style.transform = '';
    $('hand-fan').style.transform = '';
  },

  scene(count) {
    const fan = $('hand-fan');
    $('card-tilt').hidden = count > 1;
    fan.hidden = count <= 1;
    if (fan.dataset.count === String(count)) return;
    fan.dataset.count = String(count);
    fan.replaceChildren();
    if (count <= 1) return;
    fan.setAttribute('aria-label', `Open ${count} cards in hand`);
    for (let i = 0; i < count; i++) {
      const card = document.createElement('span');
      card.className = 'fan-card';
      card.style.transform = fanTransform(i, count);
      const image = document.createElement('img');
      image.src = 'assets/oracle-back.svg';
      image.alt = '';
      image.draggable = false;
      card.append(image);
      fan.append(card);
    }
    const label = document.createElement('span');
    label.className = 'fan-label';
    label.textContent = 'Open your hand';
    fan.append(label);
  },

  async flip(reveal) {
    const from = reveal ? 0 : 180;
    const to = reveal ? 180 : 0;
    $('card').dataset.face = reveal ? 'front' : 'back';
    await Promise.all([
      play($('card'), [
        { transform: `rotateY(${from}deg)` },
        { transform: `rotateY(${to + (reveal ? 5 : -5)}deg)`, offset: .85 },
        { transform: `rotateY(${to}deg)` }
      ], { duration: reveal ? 680 : 460 }),
      play($('card-tilt'), [
        { transform: 'translate3d(0,0,0) rotateX(0deg)' },
        { transform: 'translate3d(0,-22px,45px) rotateX(9deg) rotateZ(-3deg)', offset: .4 },
        { transform: 'translate3d(0,0,0) rotateX(0deg)' }
      ], { duration: reveal ? 720 : 480 })
    ]);
  },

  async deal(count) {
    if (preference.matches || document.hidden) return;
    const layer = $('deal-layer');
    const stage = $('deck-stage');
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const tableWidth = document.querySelector('.card-table').clientWidth;
    const gap = Math.min(12, tableWidth * .022);
    const scale = Math.min(count === 5 ? .34 : count === 3 ? .48 : .76,
      (tableWidth - 24 - gap * (count - 1)) / count / width);
    const spacing = width * scale + gap;
    const sourceX = -tableWidth * .27;
    const sourceY = -height * .30;
    const source = `translate3d(${sourceX}px,${sourceY}px,10px) rotateZ(-12deg) scale(.5)`;
    const dealt = [];
    stage.classList.add('is-dealing');
    const shoe = document.createElement('div');
    shoe.className = 'dealer-shoe';
    const back = document.createElement('img');
    back.src = 'assets/oracle-back.svg';
    back.alt = '';
    shoe.append(back);
    layer.append(shoe);
    try {
      await play(shoe, [
        { transform: 'translate3d(0,0,0) rotateZ(0deg) scale(1)' },
        { transform: source }
      ], { duration: 200, fill: 'forwards' });
      const deals = [];
      for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = 'dealing-card';
        card.style.zIndex = String(count - i + 1);
        card.style.opacity = '0';
        const image = document.createElement('img');
        image.src = 'assets/oracle-back.svg';
        image.alt = '';
        card.append(image);
        layer.append(card);
        const x = (i - (count - 1) / 2) * spacing;
        const y = height * .22;
        const angle = [ -3, 2, -1, 3, -2 ][i];
        const landing = `translate3d(${x}px,${y}px,2px) rotateZ(${angle}deg) scale(${scale})`;
        dealt.push({ card, landing });
        deals.push(play(card, [
          { transform: source, opacity: 0 },
          { transform: source, opacity: 1, offset: .06 },
          { transform: `translate3d(${(sourceX + x) / 2}px,${(sourceY + y) / 2 - 9}px,18px) rotateX(8deg) rotateZ(-6deg) scale(${(.5 + scale) / 2})`, opacity: 1, offset: .42 },
          { transform: `translate3d(${x + 3}px,${y - 2}px,3px) rotateZ(${angle + 1}deg) scale(${scale})`, opacity: 1, offset: .85 },
          { transform: landing, opacity: 1 }
        ], { duration: 320, delay: i * 130, endDelay: 120, fill: 'both', easing: 'cubic-bezier(.2,.72,.25,1)' }));
      }
      await Promise.all(deals);
      await Promise.all(dealt.map(({ card, landing }, i) => play(card, [
        { transform: landing, opacity: 1 },
        { transform: count === 1 ? 'translate3d(0,0,2px) rotateZ(0deg) scale(1)' : fanTransform(i, count), opacity: 1 }
      ], { duration: 260, delay: i * 12, fill: 'forwards' })));
    } finally {
      stage.classList.remove('is-dealing');
    }
  },

  cleanupDeal() {
    $('deal-layer').replaceChildren();
    $('deck-stage').classList.remove('is-dealing');
  },

  async ready() {
    await Promise.all([
      ...Array.from($('hand-fan').querySelectorAll('.fan-card')).map((card, i) => play(card, [
        { transform: card.style.transform, opacity: .35 },
        { transform: card.style.transform, opacity: 1 }
      ], { duration: 220, delay: i * 20 })),
      ...Array.from($('deal-layer').children).map(card => play(card, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' })),
      play($('hand-count'), [{ transform: 'scale(.6)' }, { transform: 'scale(1.18)', offset: .6 }, { transform: 'scale(1)' }], { duration: 340 })
    ]);
  },

  async release() {
    const cards = Array.from($('hand-fan').querySelectorAll('.fan-card'));
    if (!$('hand-fan').hidden) {
      await Promise.all(cards.map((card, i) => play(card, [
        { transform: card.style.transform, opacity: 1 },
        { transform: 'translate3d(0,12px,-60px) rotateY(25deg) scale(.72)', opacity: 0 }
      ], { duration: 260, delay: (cards.length - i - 1) * 25, fill: 'forwards' })));
    } else if ($('card').dataset.face === 'front') {
      await this.flip(false);
    }
  },

  async shuffle() {
    await Promise.all([
      play(document.querySelector('.under-one'), [
        { transform: 'rotate(-3deg)' },
        { transform: 'translate3d(-42px,-15px,25px) rotateY(-17deg) rotateZ(-13deg)', offset: .4 },
        { transform: 'translate3d(18px,-3px,10px) rotateZ(5deg)', offset: .72 },
        { transform: 'rotate(-3deg)' }
      ], { duration: 650 }),
      play(document.querySelector('.under-two'), [
        { transform: 'rotate(4deg)' },
        { transform: 'translate3d(42px,-8px,18px) rotateY(17deg) rotateZ(14deg)', offset: .4 },
        { transform: 'translate3d(-14px,-5px,8px) rotateZ(-5deg)', offset: .72 },
        { transform: 'rotate(4deg)' }
      ], { duration: 650 }),
      play($('card-tilt'), [
        { transform: 'translateY(0)' },
        { transform: 'translate3d(0,-25px,50px) rotateX(8deg) rotateZ(-4deg)', offset: .4 },
        { transform: 'translateY(0)' }
      ], { duration: 650 })
    ]);
  },

  pulse() {
    return play($('deck-stage'), [{ opacity: .65 }, { opacity: 1 }], { duration: 260 });
  },

  async open(dialog) {
    if (dialog.open || dialog.dataset.closing) return;
    dialog.showModal();
    await Promise.all([
      play(dialog, [{ opacity: 0, transform: 'perspective(1200px) translateY(18px) rotateX(5deg) scale(.98)' }, { opacity: 1, transform: 'perspective(1200px) translateY(0) rotateX(0deg) scale(1)' }], { duration: 300 }),
      ...Array.from(dialog.querySelectorAll('.held-card')).map((card, i) => play(card, [
        { opacity: 0, transform: 'perspective(1000px) translateY(18px) rotateY(-22deg) rotateX(5deg) scale(.96)' },
        { opacity: 1, transform: 'perspective(1000px) translateY(0) rotateY(0deg) rotateX(0deg) scale(1)' }
      ], { duration: 430, delay: 75 + i * 55 }))
    ]);
  },

  async close(dialog) {
    if (!dialog.open || dialog.dataset.closing) return;
    dialog.dataset.closing = 'true';
    await play(dialog, [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(8px) scale(.985)' }], { duration: 160 });
    dialog.close();
    delete dialog.dataset.closing;
  },

  initialize(isBusy) {
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    let frame;
    const stage = $('deck-stage');
    stage.addEventListener('pointermove', event => {
      if (isBusy() || preference.matches || !finePointer.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (isBusy()) return;
        const rect = stage.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
        const surface = $('hand-fan').hidden ? $('card-tilt') : $('hand-fan');
        surface.style.transform = `rotateX(${-y * 5}deg) rotateY(${x * 7}deg)`;
      });
    });
    stage.addEventListener('pointerleave', () => { cancelAnimationFrame(frame); this.resetTilt(); });
    preference.addEventListener('change', () => { if (preference.matches) this.resetTilt(); });
  }
};
