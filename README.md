# Pixel Ball Racers

A tiny browser MVP for a top-down kids racing game, adapted from the original Fairy High prototype.

## Game loop

- One human player races against three NPC cars.
- The game clock is six minutes.
- The first minute is a warm-up race.
- At 5:00 remaining, Power Balls appear around the circuit.
- A racer can carry one ball at a time.
- The player throws with Space or E. NPC racers can also throw at the player.
- A successful hit makes the target car burst into pixels and pauses the whole race.
- If the player is hit, the player chooses a replacement car.
- If an NPC is hit, the NPC receives a replacement car automatically.
- A 3-2-1 countdown restarts the race.
- The timer is frozen while the race is paused.
- Final score is laps completed plus successful hits.

## Play locally

Open index.html in a browser. For full PWA/offline behaviour, serve the folder over HTTP instead of opening it as a file URL.

Desktop controls:

- Up arrow or W: accelerate
- Down arrow or S: brake/reverse
- Left/Right arrows or A/D: steer
- Space or E: throw a Power Ball
- Restart button: restart

iPhone/iPad controls:

- On-screen steering and pedals
- THROW button

## Deploy with GitHub Pages

This repo includes .github/workflows/deploy-pages.yml.

1. In GitHub: Settings -> Pages -> Build and deployment -> Source -> GitHub Actions.
2. Push or merge to main.
3. GitHub Actions deploys the game automatically.

The project URL remains:

https://zebzobzap.github.io/fairy-high/

## MVP architecture

- Plain HTML, CSS and JavaScript.
- Canvas-rendered pixel graphics.
- No external JavaScript dependencies.
- Keyboard and touch controls.
- PWA manifest and offline cache.
- GitHub Pages deployment.
