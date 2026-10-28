// Progress is independent of the UI: clearing and shuffling never restore seen cards.
export class Deck {
  constructor(ids, saved, random = Math.random) {
    this.ids = [...new Set(ids)];
    this.random = random;
    const valid = saved && JSON.stringify(saved.ids) === JSON.stringify(this.ids)
      && Array.isArray(saved.remaining)
      && new Set(saved.remaining).size === saved.remaining.length
      && saved.remaining.every(id => this.ids.includes(id))
      && (saved.current === null || this.ids.includes(saved.current))
      && (saved.last === null || this.ids.includes(saved.last))
      && !saved.remaining.includes(saved.current)
      && !saved.remaining.includes(saved.last);
    this.remaining = valid ? [...saved.remaining] : [...this.ids];
    this.current = valid ? saved.current : null;
    this.last = valid ? saved.last : null;
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

  snapshot() {
    return { ids: [...this.ids], remaining: [...this.remaining], current: this.current, last: this.last };
  }
}
