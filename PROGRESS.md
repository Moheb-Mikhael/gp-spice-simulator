# SPICE Post-Processing Suite â€” Egyptian EDA Hub

## Project Status (June 12, 2026)

### What Exists
- **C++ Simulation Engine**: `sim/` â€” Full SPICE-compatible circuit simulator compiled to WebAssembly via Emscripten
- **Production Web Build**: `gp-web-release/` â€” Working browser-based simulator (`spice_engine.wasm`, `index.html`, `index.css`, `app.js`)
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
| Q&A Community | Team Discussions placeholder + contact link | Done |
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
- No server needed â€” all static files
- Team Discussions for Q&A (to be set up)
- MIT OCW YouTube videos for initial tutorials (placeholder)

### Files
```
gp-web-release/             â† Team repo root (deployed to Pages)
â”œâ”€â”€ index.html              â† Landing page
â”œâ”€â”€ css/style.css           â† Landing page styles
â”œâ”€â”€ js/main.js              â† Landing page scripts
â”œâ”€â”€ data/commands.json      â† SPICE command search index
â”œâ”€â”€ PROGRESS.md             â† This file
â”œâ”€â”€ simulator/              â† Production simulator
â”‚   â”œâ”€â”€ index.html
â”‚   â”œâ”€â”€ index.css
â”‚   â”œâ”€â”€ app.js
â”‚   â”œâ”€â”€ spice_engine.js
â”‚   â””â”€â”€ spice_engine.wasm
â”œâ”€â”€ .git/
```
