# Implementation and verification

1. Collect and deduplicate 200+ actual Pinterest meme images. Keep an image-to-source inventory and optimized local WebP files.
2. Implement a Fisher–Yates deck with serialized remaining/current/last IDs. Clearing never restores cards. Exhaustion starts a new shuffled round, avoiding an immediate repeated card.
3. Implement static responsive UI with draw, shuffle, clear, accessible dialogs, counters, image load failure feedback and reduced-motion support.
4. Verify the full non-repeating draw cycle across saves, shuffles, and clears using `npm test`. Validate the actual card manifest, exact image hashes, source URLs, and file formats.
5. Review desktop and mobile layouts, draw/clear/shuffle, reload persistence, and source attribution in the browser. Publish the reviewed static output.

No account, database, AI reading service, or server is required. Image collection and code implementation can proceed independently.
