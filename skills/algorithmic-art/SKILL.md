---
name: algorithmic-art
description: Create generative algorithmic art as interactive HTML artifacts using p5.js with seeded randomness and parameter controls. Use when users ask for generative art, algorithmic art, creative coding, or want interactive visual experiences with emergent complexity.
---

# Algorithmic Art

A toolkit for creating generative, algorithmic artwork expressed as interactive HTML artifacts using p5.js.

## Core Workflow

### Step 1: Algorithmic Philosophy (4-6 paragraphs)

Before writing any code, develop an **Algorithmic Philosophy** — the conceptual and aesthetic foundation:

- **Name the movement** (1-2 words): e.g., "Spectral Entropy", "Cellular Drift", "Resonant Fields"
- **Describe the visual logic**: How do randomness, iteration, and emergence generate form?
- **Define the palette and motion language**: Color relationships, movement rhythms, density
- **Articulate emergence**: What simple rules create the complex whole?

The philosophy should be poetic but precise — concrete enough to guide implementation, open enough for interpretation.

### Step 2: p5.js Implementation

Use p5.js with **seeded randomness** for reproducibility:

```javascript
let seed = 42;

function setup() {
  createCanvas(800, 800);
  randomSeed(seed);
  noiseSeed(seed);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  // Noise field driving particle angle
  let angle = noise(x * 0.003, y * 0.003, frameCount * 0.005) * TWO_PI * 4;
  let colorShift = random(-15, 15);
}
```

**Patterns to consider:**
- Noise fields driving particle movement
- Recursive subdivision (quadtrees, fractals)
- L-systems for organic branching
- Cellular automata for emergent texture
- Reaction-diffusion for natural patterns

### Step 3: Interactive Controls

Add HTML controls outside the canvas:

```html
<div id="controls">
  <label>Seed: <input type="number" id="seed" value="42"></label>
  <label>Density: <input type="range" id="density" min="1" max="100" value="50"></label>
  <button onclick="regenerate()">Regenerate</button>
  <button onclick="saveCanvas('artwork', 'png')">Save PNG</button>
</div>
```

Parameters to expose: seed, particle count, speed, color palette, noise scale.

### Step 4: Output as Self-Contained HTML

Bundle everything into a single `.html` file:
- Embed p5.js via CDN (`https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js`)
- Inline all JavaScript and CSS
- No external dependencies required

## Key Principles

- **Seeded randomness**: The seed is always a controllable parameter
- **Emergence over prescription**: Complex visuals arise from simple rules
- **Philosophy-first**: The conceptual foundation shapes every visual decision
- **Interactive exploration**: Controls invite curiosity and discovery
- **Reproducibility**: Same seed always produces same output

## Quality Bar

The final artifact should feel like a genuine artwork — not a demo. It should reward extended viewing, reveal detail on closer inspection, and feel like it emerges from a coherent visual philosophy.
