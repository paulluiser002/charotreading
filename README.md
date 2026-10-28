# Charot Reading

A mobile responsive, login-free photographic tarot reading site. Choose a single-card, three-card, or five-card reading, then draw the complete hand. Open Cards in hand to interpret the images together. Three- and five-card hands start face down; tap each card for a 3D reveal. Revealed cards remain revealed until Next reading. The hand stays saved until Next reading; shuffling or clearing the displayed card does not release it. Each image links to its Pinterest source. On mobile, Fullscreen expands the reading and uses native fullscreen when supported; Exit fullscreen restores the standard view.

## Run

```sh
npm start
```

Open http://localhost:4173. Requires Python 3 for the local static server. No dependency installation or build step is needed. Any static web host can serve `dist/`.

## Verify

```sh
npm test
node scripts/validate-assets.mjs
```

Deck progress is stored in this browser's localStorage. Clearing a card and shuffling never restore drawn cards. Reset history, in the footer, clears past draw history while preserving the currently held hand. The held cards stay reserved until Next reading. After every card is seen, a fresh round starts without immediately repeating the last card. Private browsing, clearing storage, or using another device starts a new deck. Concurrent draws in separate tabs are not an atomic operation.

## Images

`dist/cards.json` contains card IDs, local image paths, English descriptions, Pinterest sources, and content hashes. The images live in `dist/assets/cards/`. Assets are served locally so visitors do not need Pinterest access. Pinterest provenance does not establish image licensing; images remain their creators' work. See `asset-report.json` for collection and deduplication notes.

To add or replace cards, update the manifest and the corresponding image files, then run asset validation. Appending new cards preserves held readings and draw history, shuffling the additions into the unseen deck. Removing or reordering existing cards starts a fresh round to keep saved progress consistent.

The header coffee button reuses the One ODC support QR and Hire me contact. Page loads feature a 2.6-second engraved-card scene; reduced motion skips it. The sun logo rotates slowly; decorative loops stop in background tabs and respect reduced motion. Static script URLs are versioned when their interfaces change to prevent mixing cached releases.

## Analytics

GA4 property `G-XE6T7Y5VCY` receives automatic page views and custom events: `draw_hand` (after a successful draw is saved), `open_hand`, `reveal_card` (first reveal only), `next_reading`, `open_support`, and `select_hire`. Reading parameters contain hand size and card position only; no image IDs, descriptions, contact email, or reading content are sent as custom parameters. Google Signals and advertising personalization signals are disabled. Localhost previews do not load the tag. Analytics loads asynchronously; blocking Google does not prevent readings.

Use GA4 Realtime to confirm incoming traffic and events after publishing. Browser/ad blockers and cookie restrictions may reduce recorded traffic. Coffee support opens are not payment confirmations.
