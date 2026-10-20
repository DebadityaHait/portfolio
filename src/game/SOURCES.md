# Dinosaur runner

Gameplay and sprite sheets: [Soheilexe/Chrome-Dino](https://github.com/Soheilexe/Chrome-Dino), pinned to commit `086f0a64265a0d4893b6c648d202ee1fbb7db257`. This repository extracts the Chromium 2024 modular runner. BSD 3-Clause license is distributed at `/licenses/t-rex-runner.txt`; copyright notices remain in the vendor modules. It replaces the earlier wayou extraction.

Sources are the dependency graph under `resources/dino_game/offline.js` (plus `resources/constants.js`), copied to `vendor/`. Sprites are from `images/default_100_percent/100-offline-sprite.png` and `images/default_200_percent/200-offline-sprite.png` under that revision.

Portfolio adaptations:

- Every `window.Runner` reference uses `runtime.Runner` in a module-local context. No high-score callback is installed on `window`.
- Runner dimensions/configuration and Trex jump configuration are copied per instance. Sprite lookup is scoped to the owning game surface.
- Upstream resize and system-theme hooks are removed from initialization. The adapter owns a ResizeObserver, scoped keyboard/pointer handlers, blur and visibility listeners.
- Adapter overrides prevent page-wide arcade mode, stylesheet injection, document keyboard capture, automatic resume, generated audio and slow-mode activation. Only standard movement settings feed the shared board.
- Canvas clearing remains transparent, including high-score clearing. The page theme controls sprite contrast without inverting the page or painting a white rectangle.
- The player uses Chromium's original running, jumping, ducking and crash frames. A luminance mask preserves eyes/cutouts; the atlas is tinted once per theme for contrast. The banner's static canvas uses the matching original frame and waits for motion completion before handing off. There is no per-frame DOM positioning or canvas CSS filter.
- The loop uses one bound animation callback and caps simulation rendering at 60Hz on high refresh displays. The canvas does no idle rendering before a run, pauses on blur/hidden/offscreen, and sends React state only when it changes. Ctrl and Down can both crouch; releasing one held crouch key does not cancel the other.
- Horizon strips tile over the current logical viewport plus the incoming strip, rather than assuming two 600px segments cover every viewport. Source crop offsets use the appropriate 1x/2x sprite dimensions.
- Restart tolerates an absent game-over panel. Disposal cancels runner, game-over and high-score animation frames, resize/sound intervals, observers, listeners and any audio contexts.
- Gameplay inputs do not restart completed runs. Replay uses the explicit Restart control; the best unshared score is kept independently in session storage until a successful submission.
- Optional collision feedback uses the existing opt-in desk sounds. No upstream embedded audio, page CSS, demo config UI or tracking is included.

The game uses one canvas from initialization through inline/expanded transitions. Its native dialog switches between nonmodal and modal presentation without changing the DOM parent or restarting the runner. Resizing pauses simulation and updates rendering dimensions. Leaving the banner disposes the instance.
