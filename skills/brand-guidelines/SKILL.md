---
name: brand-guidelines
description: Apply Anthropic brand colors, typography, and visual styling to presentations, documents, and artifacts. Use when asked to style output with Anthropic's visual identity — brand colors, Poppins/Lora fonts, or the official color palette.
---

# Anthropic Brand Guidelines

Apply Anthropic's official brand identity to presentations and documents.

## Brand Colors

### Core Palette
| Name | Hex | Usage |
|------|-----|-------|
| Dark | `#141413` | Primary text, dark backgrounds |
| Light | `#faf9f5` | Light backgrounds, text on dark |
| Mid Gray | `#b0aea5` | Secondary elements |
| Light Gray | `#e8e6dc` | Subtle backgrounds |

### Accent Colors
| Name | Hex | Usage |
|------|-----|-------|
| Orange | `#d97757` | Primary accent |
| Blue | `#6a9bcc` | Secondary accent |
| Green | `#788c5d` | Tertiary accent |

## Typography

| Element | Font | Fallback |
|---------|------|----------|
| Headings (24pt+) | Poppins | Arial |
| Body text | Lora | Georgia |

## Applying via python-pptx

```python
from pptx.dml.color import RGBColor

# Brand color constants
DARK       = RGBColor(0x14, 0x14, 0x13)
LIGHT      = RGBColor(0xfa, 0xf9, 0xf5)
MID_GRAY   = RGBColor(0xb0, 0xae, 0xa5)
LIGHT_GRAY = RGBColor(0xe8, 0xe6, 0xdc)
ORANGE     = RGBColor(0xd9, 0x77, 0x57)
BLUE       = RGBColor(0x6a, 0x9b, 0xcc)
GREEN      = RGBColor(0x78, 0x8c, 0x5d)

def apply_brand_font(run, is_heading=False):
    run.font.name = "Poppins" if is_heading else "Lora"
    run.font.color.rgb = DARK

def text_color_for_bg(is_dark_bg):
    return LIGHT if is_dark_bg else DARK
```

## Application Rules

1. **Headings** (font size ≥ 24pt): Poppins, Dark color
2. **Body text**: Lora, Dark color
3. **Non-text shapes**: Cycle through Orange → Blue → Green accents
4. **Slide backgrounds**: Use Dark (`#141413`) or Light (`#faf9f5`)
5. **Contrast**: Always verify text color against background for readability

## Font Availability

Fonts are sourced from the system. If unavailable:
- Poppins → Arial (headings)
- Lora → Georgia (body)

Pre-install Poppins and Lora for best results.
