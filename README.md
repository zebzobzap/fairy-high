# Fairy High + Pixel Ball Racers

Two small browser games live side by side in this repository.

## Fairy High

Fairy High remains the original top-down fairy game.

Play:
https://zebzobzap.github.io/fairy-high/

## Pixel Ball Racers

Pixel Ball Racers is a one-player racing game against NPC cars.

Play:
https://zebzobzap.github.io/fairy-high/pixel-racers/

Current racing MVP:

- One human player and three NPC racers.
- Six-minute race: one-minute warm-up, then five minutes with Power Balls.
- The player car cruises automatically with assisted steering and track-centering.
- Only the human player can collect and throw Power Balls.
- Hitting an NPC makes its car burst into pixels, pauses the race, replaces the NPC car and restarts with a 3-2-1 countdown.
- Keyboard and touch controls.
- Separate PWA/offline caches for each game.

## Deployment

The GitHub Pages workflow deploys the entire repository from main, so both games are published together.
