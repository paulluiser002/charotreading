# The Quiet Oracle

A mobile responsive, login-free photographic tarot reading site. Draw one card, shuffle the remaining cards, or clear the current card. Each image links to its Pinterest source.

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

Deck progress is stored in this browser's localStorage. Clearing a card and shuffling never restore drawn cards. After every card is seen, a fresh round starts without immediately repeating the last card. Private browsing, clearing storage, or using another device starts a new deck. Concurrent draws in separate tabs are not an atomic operation.

## Images

`dist/cards.json` contains card IDs, local image paths, English descriptions, Pinterest sources, and content hashes. The images live in `dist/assets/cards/`. Assets are served locally so visitors do not need Pinterest access. Pinterest provenance does not establish image licensing; images remain their creators' work. See `asset-report.json` for collection and deduplication notes.

To add or replace cards, update the manifest and the corresponding image files, then run asset validation. A changed card inventory starts a fresh round to keep saved progress consistent.
