Original prompt: Review and improve Pumatlarge/cuting-gumoku-game, add a suitable license, and publish the fixes.

- Added MIT licensing and README links.
- Added draw handling and validation for messages received from the public MQTT broker.
- Replaced the deprecated copy API and removed an unused font request and duplicate listener.
- Browser interaction check passed: the help dialog starts a game, the player move and AI reply both render, state output matches the canvas, and no console errors were recorded.
- TODO: Compress the large character PNG files if page-load performance becomes a problem.
