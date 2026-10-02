# Fairy High: Entry Challenge

A tiny browser MVP for a top-down kids fairy game.

## Play locally

Open `index.html` in a browser. For full PWA/offline behaviour, serve the folder over HTTP instead of opening it as a `file://` URL.

Desktop controls:

- Arrow keys or WASD: move
- E: interact
- Restart button: restart

iPhone/iPad controls:

- On-screen direction pad: move
- Magic / Talk: interact

## Deploy with GitHub Pages

This repo includes `.github/workflows/deploy-pages.yml`.

1. In GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. Push to `main`.
3. GitHub Actions deploys the game automatically after each push.

The normal project URL is:

`https://zebzobzap.github.io/fairy-high/`

## Install on iPhone or iPad

Open the deployed URL in Safari, use **Share → Add to Home Screen**, and enable **Open as Web App** when offered.

## Current MVP

- Top-down pixel-style mushroom fairy.
- Entry Garden map.
- Three glowing petals.
- Pippa, a blossom fairy friend.
- Broken bridge interaction.
- Fairy High gate and completion screen.
- Keyboard and touch controls.
- PWA manifest, home-screen icon and offline cache.
- No external JavaScript dependencies.
