# Retro-Modern Arcade Collection - Static Web App

A high-performance arcade homepage featuring classic games built with native JavaScript and HTML5 Canvas.

## Tech Stack

- **Frontend**: JavaScript (ES6+), HTML5 Canvas, Synthwave CSS
- **Architecture**: 100% Static (HTML/CSS/JS)
- **Deployment**: Vercel, Netlify, or GitHub Pages
- **Visuals**: CRT Scanlines, Neon Bloom, 3D Vector Grids, Glitch Effects

## Features

- ✅ **High Performance**: Native browser execution, no heavy frameworks or WebAssembly.
- ✅ **Optimized Logic**: 120 FPS physics for Pong, 60 FPS for Space Invaders.
- ✅ **Synthwave Aesthetic**: Neon gradients, 3D grids, and CRT overlays.
- ✅ **No Dependencies**: Zero external libraries needed (except Google Fonts).

## Deployment

Since this is a static site, you can simply open `index.html` in any browser or deploy the `web/` folder directly to any host.

### Deploy to Vercel
```bash
cd web
vercel
```

## Project Structure

- `index.html`: Main landing page with game selection.
- `game.html`: Universal game player page.
- `static/`: Global CSS and JS assets.
- `games/`: Individual game logic and assets.
- `vercel.json`: Vercel static configuration.
