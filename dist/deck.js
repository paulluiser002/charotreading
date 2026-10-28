// Progress is independent of the UI: clearing and shuffling never restore seen cards.
export class Deck {
  constructor(ids, saved, random = Math.random) {
    this.ids = [...new Set(ids)];
    this.random = random;
    const hand = saved?.hand ?? (saved?.current ? [saved.current] : []);
    const handSize = saved?.handSize ?? (hand.length === 1 ? 1 : 3);
    const valid = saved && JSON.stringify(saved.ids) === JSON.stringify(this.ids)
      && Array.isArray(saved.remaining)
      && new Set(saved.remaining).size === saved.remaining.length
      && saved.remaining.every(id => this.ids.includes(id))
      && (saved.current === null || this.ids.includes(saved.current))
      && (saved.last === null || this.ids.includes(saved.last))
      && !saved.remaining.includes(saved.current)
      && !saved.remaining.includes(saved.last)
      && [1, 3, 5].includes(handSize)
      && Array.isArray(hand)
      && new Set(hand).size === hand.length
      && (hand.length === 0 || hand.length === handSize)
      && hand.every(id => this.ids.includes(id) && !saved.remaining.includes(id));
    this.remaining = valid ? [...saved.remaining] : [...this.ids];
    this.current = valid ? saved.current : null;
    this.last = valid ? saved.last : null;
    this.hand = valid ? [...hand] : [];
    this.handSize = valid ? handSize : 3;
    if (!valid) this.shuffle();
  }

  shuffle() {
    for (let i = this.remaining.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [this.remaining[i], this.remaining[j]] = [this.remaining[j], this.remaining[i]];
    }
  }

  draw() {
    if (!this.ids.length) throw new Error('The deck is empty.');
    const newRound = this.remaining.length === 0;
    if (newRound) {
      this.remaining = [...this.ids];
      this.shuffle();
      if (this.remaining.length > 1 && this.remaining.at(-1) === this.last) {
        [this.remaining[0], this.remaining[this.remaining.length - 1]] = [this.remaining.at(-1), this.remaining[0]];
      }
    }
    this.current = this.remaining.pop();
    this.last = this.current;
    return { id: this.current, newRound };
  }

  clear() { this.current = null; }

  drawHand(size) {
    if (this.hand.length) throw new Error('Select Next reading before drawing another hand.');
    if (![1, 3, 5].includes(size)) throw new Error('Choose 1, 3, or 5 cards.');
    if (this.ids.length < size) throw new Error('There are not enough cards for this hand.');
    const selected = new Set();
    let newRound = false;
    while (selected.size < size) {
      const result = this.draw();
      selected.add(result.id);
      newRound ||= result.newRound;
    }
    this.hand = [...selected];
    this.handSize = size;
    // A hand crossing a cycle boundary must also reserve its earlier cards in the new cycle.
    this.remaining = this.remaining.filter(id => !selected.has(id));
    if (size > 1) this.current = null;
    return { ids: [...this.hand], newRound };
  }

  nextReading() {
    this.hand = [];
    this.current = null;
  }

  reset() {
    this.remaining = this.ids.filter(id => !this.hand.includes(id));
    this.current = null;
    this.last = null;
    this.shuffle();
  }

  snapshot() {
    return { ids: [...this.ids], remaining: [...this.remaining], current: this.current, last: this.last, hand: [...this.hand], handSize: this.handSize };
  }
}
