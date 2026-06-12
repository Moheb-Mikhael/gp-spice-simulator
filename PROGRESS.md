# SPICE Post-Processing Suite — Egyptian EDA Hub

## Project Status (June 12, 2026)

### What Exists
- **C++ Simulation Engine**: `sim/` — Full SPICE-compatible circuit simulator compiled to WebAssembly via Emscripten
- **Production Web Build**: `gp-web-release/` — Working browser-based simulator (`spice_engine.wasm`, `index.html`, `index.css`, `app.js`)
- **Desktop Apps**: Windows and Linux native applications of the same engine (download links coming)
- **Post-Processing Manual**: Comprehensive command reference for the SPICE Post-Processing Suite (system commands, database management, plotting, measurements, calculator)

### What's Being Built
A landing website that presents the tool as a step forward for EDA in Egypt:

| Section | Content | Status |
|---------|---------|--------|
| Sticky Nav | Logo + links to all sections + platform CTAs | Done |
| Hero | Full-viewport headline about Egyptian EDA + CTAs (cross-platform messaging) | Done |
| About the Tool | 6 feature cards including Cross-Platform | Done |
| Our Vision | Mission statement for Egyptian students in EDA | Done |
| Get the Tool | Platform cards: Web (launch), Windows (download placeholder), Linux (download placeholder) + quick-start netlist | Done |
| Search | SPICE command search from `data/commands.json` (47 commands indexed) | Done |
| Tutorials | Grid of MIT OCW videos + written guide placeholders with filter tabs | Done |
| Q&A Community | GitHub Discussions placeholder + contact link | Done |
| Footer | "Made in Egypt" credits + platform line | Done |

### Design
- **Theme**: Light & airy with Egyptian-inspired accents
- **Palette**: Sand white, Egyptian gold (#c9a23c), Nile blue (#1a4b8c), terracotta (#c4623a)
- **Fonts**: Playfair Display (headings) + Inter (body)
- **Patterns**: Subtle geometric borders, no literal symbols

### Key Decisions
- Simulator opens in a new tab (landing page is informational hub)
- Website is the container for the online tool and a way to spread the vision
- Desktop apps (Windows + Linux) exist but download links are placeholder until ready
- No server needed — all static files
- GitHub Discussions for Q&A (to be set up)
- MIT OCW YouTube videos for initial tutorials (placeholder)

### Files
```
gp-web-release/             ← GitHub repo root (deployed to Pages)
├── index.html              ← Landing page
├── css/style.css           ← Landing page styles
├── js/main.js              ← Landing page scripts
├── data/commands.json      ← SPICE command search index
├── PROGRESS.md             ← This file
├── simulator/              ← Production simulator
│   ├── index.html
│   ├── index.css
│   ├── app.js
│   ├── spice_engine.js
│   └── spice_engine.wasm
├── .git/
```
