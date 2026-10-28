# Charot Reading

<!-- impeccable:product-schema 1 -->

## Platform

web

## Purpose

A mobile responsive, login-free site for professional tarot-style readings through expressive photography. The human reader supplies each interpretation. The interface uses English exclusively and presents a formal, sincere reading experience.

## Capabilities and constraints

- Maintain at least 200 distinct Pinterest-sourced images.
- Prioritize captionless expressive photographs, candid reactions and Filipino screen moments, as seen in the user's Chrome reference board.
- Exclude quote graphics, text-heavy panels and large overlaid jokes. Small natural subtitles or logos may remain inside photographs.
- No references to memes, comedy or playful novelty in the interface, metadata or image descriptions.
- Choose a single-card, three-card, or five-card reading. Draw the complete hand before interpretation. Cards in hand opens the saved hand; Next reading is the only action that releases it. Hand and size persist across refreshes.
- Shuffle the unseen deck or clear the current single-card display without changing the hand. Avoid repeats until the complete collection is drawn, including within a hand that crosses a cycle boundary.
- Do not display remaining-card counters or draw-progress indicators. Reset history belongs in the footer, separate from the main actions, and restores past cards while keeping the current hand reserved until Next reading.
- Mobile includes a fullscreen reading control with an explicit exit. Use native fullscreen when available, otherwise an expanded reading layout.
- Save progress in browser storage. Retain keyboard access, responsive layouts and reduced-motion support.
- Keep source attribution accessible without intruding on the reading.

## Stack

Static HTML, CSS and browser JavaScript, with no runtime dependencies or backend. Preserve the existing deployment and public access.

## Design authority

The user requested a complete professional tarot redesign and English copy after the first release. Their current Chrome tab is the source image reference: https://ph.pinterest.com/arabellara4444/charot-cards/.

## Builder choices

Charot Reading is the English-facing identity; the existing site address remains unchanged. Original vector sun-and-moon engraving replaces the playful card-back illustration.
