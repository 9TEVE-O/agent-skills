---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with exceptional aesthetic quality. Use when users want visually striking UI designs, landing pages, or components that avoid generic "AI-generated" aesthetics. Focus on bold, intentional design choices with real visual personality.
---

# Frontend Design

A guide for building frontend interfaces with real design intentionality — avoiding generic aesthetics in favor of distinctive, memorable visual experiences.

## Core Principle

**Choose a clear conceptual direction and execute it with precision.** Before writing code, identify:
- The purpose and emotional tone of the interface
- A differentiating aesthetic (bold maximalism OR refined minimalism — not the default)
- What makes this design specific to this context

## Visual Elements

### Typography
- Avoid generic defaults: no Arial or Inter as the first choice
- Choose fonts with personality matched to the content
- Establish strong type hierarchy with size, weight, and spacing contrast

### Color
- Build cohesive schemes: one dominant color (60-70% weight) + 1-2 supporting + one sharp accent
- Avoid the standard "AI blue" or "startup purple" palettes
- Use color to communicate meaning and hierarchy, not just aesthetics

### Motion
- CSS animations and scroll-triggered effects add life without complexity
- Prefer purposeful micro-interactions over decorative flourishes
- Respect `prefers-reduced-motion`

### Layout
- Embrace asymmetry, overlap, and diagonal flow where appropriate
- Use negative space intentionally — breathing room is design, not emptiness
- Break out of equal-column grids when it serves the concept

### Backgrounds
- Textures, gradients, and subtle patterns create atmosphere
- A considered background elevates everything placed on top

## What to Avoid

- Generic layouts that work for any topic (not this one)
- Overused color schemes (standard blue/purple gradients)
- Clichéd patterns: cards on white, centered hero text, generic CTAs
- Predictable section order that feels like a template
- "Cookie-cutter design that lacks context-specific character"

## Implementation Standard

Production-grade means:
- All states handled (hover, focus, loading, empty, error)
- Responsive across breakpoints
- Accessible contrast ratios and keyboard navigation
- CSS custom properties for design system tokens

## Process

1. **Concept first**: Name the aesthetic direction (e.g., "Brutalist editorial", "Organic warmth", "Technical precision")
2. **Sketch the layout**: Map information hierarchy before coding
3. **Build the design system**: Colors, typography, spacing as tokens first
4. **Implement from structure down**: Layout → Components → Details → Polish

Complexity should match the vision. Maximalist designs warrant elaborate animations; minimalist designs demand perfect spacing and absolute restraint.
