# Layer 1 India — Complete CSS Extraction

This file documents every styling decision in `layer1_india.html`: the design tokens, the
two `<style>` blocks, the layout structure, and the recurring Tailwind utility patterns that
make up the components. The file uses Tailwind via CDN, so almost all styling lives in inline
utility classes rather than CSS rules. Both sources are captured here.

---

## 1. Design Tokens (from `tailwind.config`)

```js
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brandDark:  '#0c0c0c',
        brandGray:  '#1c1c1c',
        brandGold:  '#D4AF37',
        brandRed:   '#991B1B',
        brandGreen: '#10B981',
        brandCyan:  '#06B6D4',
      },
      letterSpacing: { widest: '0.25em', header: '0.5em' },
    },
  },
}
```

Tailwind plugins loaded: `forms`, `container-queries`.

### Color palette (named + raw hex used inline)

| Token | Hex | Role |
|-------|-----|------|
| brandGold | `#D4AF37` | primary accent, active states, focus borders, ROR status |
| brandCyan | `#06B6D4` | secondary accent, info boxes, NR status |
| brandGreen | `#10B981` | success, "met" checklist states |
| brandRed | `#991B1B` | warnings, errors, ineligibility alerts |
| brandDark | `#0c0c0c` | — |
| brandGray | `#1c1c1c` | — |
| page background | `#050505` | body base |
| card surface | `#121212` | inputs, selects, raised surfaces (used 182×) |
| elevated surface | `#1A1A1A` / `#1a1a1a` | tooltips, popovers (46×) |
| hover surface | `#161616` | hover state on cards (12×) |
| border surface | `#2A2A2A` / `#2a2a2a` | stronger borders (9×) |
| muted text | `#A1A1AA` | body default text color |

Brand-specific accent hexes appearing once each (integration logos / external brand colors):
`#ff6a00`, `#f3ba2f`, `#5741d9`, `#387ed1`, `#00d09c`, `#00b8d9`, `#0052ff`.

### Typography scale (inline text sizes, by frequency)

| Class | Usage | Typical role |
|-------|-------|--------------|
| `text-xs` (12px) | 526× | body of inputs, labels |
| `text-[9px]` | 429× | micro-labels, field captions |
| `text-[10px]` | 304× | section sub-labels |
| `text-[8px]` | 86× | smallest badges |
| `text-xl` | — | panel headings (with `font-display uppercase`) |

Font weights: `font-black` (900) dominates labels (518×), `font-bold` (271×) for emphasis.
`font-mono` (JetBrains Mono, 276×) is used for all numeric/currency inputs and PAN.

Letter spacing: `tracking-widest` (0.25em, custom) appears 535× — nearly every uppercase
label uses it. This is the signature typographic treatment of the whole UI.

---

## 2. Raw CSS — Style Block 1 (lines 1115–1170)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;700;800&display=swap');

/* Custom scrollbar — thin, dark track, gold thumb on hover */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: #050505; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: rgba(212, 175, 55, 0.4); }

/* Body — dark base with two faint radial brand glows, fixed attachment */
body {
    font-family: 'Inter', sans-serif;
    background-color: #050505;
    color: #A1A1AA;
    background-image:
        radial-gradient(circle at top right, rgba(212, 175, 55, 0.03) 0%, transparent 40%),
        radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.02) 0%, transparent 40%);
    background-attachment: fixed;
}

/* The core surface treatment — frosted glass card */
.glass-card {
    background-color: rgba(18, 18, 18, 0.7);     /* #121212 at 70% */
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    backdrop-filter: blur(12px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.glass-card:hover {
    border-color: rgba(212, 175, 55, 0.2);       /* gold border on hover */
    box-shadow: 0 0 30px rgba(212, 175, 55, 0.05);
}

/* Animated silver shimmer text (used on big headings) */
.heading-silver-shimmer {
    background: linear-gradient(90deg, #94A3B8 0%, #F1F5F9 45%, #FFFFFF 50%, #F1F5F9 55%, #94A3B8 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer-text 5s linear infinite;
    font-weight: 800;
    text-shadow: 0 0 20px rgba(255,255,255,0.05);
}
@keyframes shimmer-text {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
}

/* Active compliance step in the sidebar — gold left bar + tinted bg */
.step-btn.active {
    background-color: rgba(212, 175, 55, 0.1);
    border-left: 4px solid #D4AF37;
    color: #FFFFFF;
}

/* Locked compliance step — dimmed, not clickable */
.step-btn.locked {
    opacity: 0.35;
    cursor: not-allowed;
}
```

## 3. Raw CSS — Style Block 2 (lines 13465–13471)

```css
/* AI document-scan animation (the scanning line that sweeps down during OCR) */
@keyframes scan {
    0%   { transform: translateY(0);    opacity: 0.5; }
    50%  { opacity: 1; }
    100% { transform: translateY(96px); opacity: 0.5; }
}
```

---

## 4. Layout Structure (placements, positions, divisions)

The whole page is a vertical flex column with a sticky header and a two-column main area.

```
body.min-h-screen.flex.flex-col
│
├── header  (sticky top-0 z-50, dark translucent, blurred, bottom border)
│   └── div.max-w-[1440px].mx-auto.px-4.lg:px-8.h-20.flex.items-center.justify-between
│       └── logo + nav + actions
│
└── main  (max-w-[1440px] w-full mx-auto px-4 lg:px-8 py-8
           flex-1 flex flex-col lg:flex-row gap-8)
    │
    ├── aside  ← LEFT SIDEBAR
    │   └── w-full lg:w-72 shrink-0 flex flex-col gap-2
    │       ├── "Compliance Steps" label
    │       ├── nav#sidebar-steps  (10 step buttons, .step-btn)
    │       └── ITR Form Display card
    │
    └── section  ← RIGHT PANEL COLUMN
        └── flex-1 flex flex-col gap-6
            ├── div#panel-step-profile   (glass-card p-6 lg:p-8 flex flex-col gap-6)
            ├── div#panel-step-dtaa       (… + hidden)
            ├── div#panel-step-compliance (… + hidden)
            ├── div#panel-step-assets     (… + hidden)
            ├── div#panel-step-income     (… + hidden)
            ├── div#panel-step-hp         (… + hidden)
            ├── div#panel-step-business   (… + hidden)
            ├── div#panel-step-deductions (… + hidden)
            ├── div#panel-step-credits    (… + hidden)
            └── div#panel-step-output     (… + hidden)
```

### Key layout facts

- **Outer width cap:** `max-w-[1440px]` on both header and main, centered with `mx-auto`.
- **Horizontal padding:** `px-4` mobile, `lg:px-8` desktop.
- **Header height:** fixed `h-20` (80px), `sticky top-0 z-50`, background `bg-[#050505]/90`
  with `backdrop-blur-md` and `border-b border-white/5`.
- **Two-column split:** `main` is `flex-col` on mobile, `lg:flex-row` on desktop. Sidebar is
  fixed `lg:w-72` (288px) and `shrink-0`; the panel `section` is `flex-1` (fills the rest).
- **Column gap:** `gap-8` between sidebar and panel.
- **Panel switching:** only one `#panel-step-*` is visible; the rest carry `hidden`.
  Switching is done in JS by toggling the `hidden` class (this is the DOM logic that XState
  replaces in the React port).
- **Panel internal rhythm:** every panel is `glass-card p-6 lg:p-8 flex flex-col gap-6`.

---

## 5. Recurring Component Class Signatures

These are the exact, verbatim class strings that repeat across the file. In the React port,
each becomes a reusable component or a shared class constant.

### Field micro-label (124× — the most common component)
```
block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1
```

### Section header label (78×)
```
text-[10px] text-white/70 font-black uppercase tracking-widest border-b border-white/10 pb-1
```

### Currency / numeric input (86× — the `inr-input` pattern)
```
inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono
```
Note: `inr-input` has **no CSS rule** — it is a JS hook. A `querySelectorAll('.inr-input')`
attaches Indian-format currency masking (lakhs/crores comma grouping) to these inputs.

### Standard select / text input on dark surface (10×)
```
w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none
```

### Gold section heading (28×)
```
text-xs font-black uppercase tracking-widest text-brandGold
```

### Panel heading (10×)
```
text-xl font-bold text-white tracking-wide font-display uppercase
```

### Toggle switch — the full peer pattern (10×)
Wrapper:
```
relative inline-flex items-center cursor-pointer
```
Hidden checkbox:
```
sr-only peer
```
Track + knob (gold when checked):
```
w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 peer-checked:bg-brandGold peer-checked:after:bg-black
```

### Settings/info row (11×)
```
flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl
```

### Card sub-container (18×)
```
p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4
```

### Tooltip popover (21× — hover-reveal)
```
hidden group-hover:block absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#1A1A1A] border border-brandGold/20 rounded-xl shadow-2xl text-[9px] text-white/80 normal-case tracking-normal leading-relaxed z-20 text-left
```

### Tooltip trigger (the help icon, 22×)
```
cursor-help text-brandGold/70 hover:text-brandGold transition-colors
```

### Checkbox (custom, gold, 12×)
```
text-brandGold bg-black border-white/20 focus:ring-brandGold focus:ring-offset-black
```

---

## 6. Grid Systems Used

The form fields are laid out in responsive grids that stack on mobile:

| Pattern | Usage | Meaning |
|---------|-------|---------|
| `grid grid-cols-1 md:grid-cols-2 gap-4` | 44× | two-column field pairs |
| `grid grid-cols-1 md:grid-cols-3 gap-4` | 40× | three-column field rows |
| `grid grid-cols-1 md:grid-cols-4 gap-4` | 34× | four-column (quarterly data) |
| `grid grid-cols-1 md:grid-cols-5 gap-4` | 10× | five-column dense rows |
| `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` | — | responsive 1→2→3 |

All grids start single-column on mobile (`grid-cols-1`) and expand at the `md`/`lg`
breakpoint. Standard gap is `gap-4` (1rem).

---

## 7. Border Radius Scale

| Class | Radius | Usage |
|-------|--------|-------|
| `rounded` | 4px | small chips, 103× |
| `rounded-lg` | 8px | buttons, 172× |
| `rounded-xl` | 12px | inputs, most cards, 338× (dominant) |
| `rounded-2xl` | 16px | sub-containers, 101× |
| `rounded-full` | pill | toggles, badges, 69× |
| `.glass-card` | 16px | via CSS rule |

---

## 8. Recurring Surface + Border Combinations

| Surface | Border | Where |
|---------|--------|-------|
| `bg-white/5` | `border border-white/10` | input fields, info rows (most common) |
| `bg-[#121212]` | `border border-white/10` | selects, dark inputs |
| `bg-white/5` | `border border-white/5` | sub-containers (softer) |
| `rgba(18,18,18,0.7)` | `rgba(255,255,255,0.05)` | glass-card |
| `bg-[#1A1A1A]` | `border-brandGold/20` | tooltips |

Focus state is consistent everywhere: `focus:border-brandGold` + `focus:ring-0` (or
`focus:outline-none`). The gold focus border is the single unifying interaction signal.

---

## 9. Animations Summary

| Name | Duration | Trigger | Purpose |
|------|----------|---------|---------|
| `shimmer-text` | 5s linear infinite | always-on | silver gradient sweep on big headings |
| `scan` | (applied inline) | during AI OCR | scanning line sweeps down 96px |
| `.glass-card` transition | 0.3s cubic-bezier | hover | border + shadow ease-in |

`transition-all` (240×) and `transition-colors` (70×) handle the rest of the micro-interactions.

---

## 10. Port Notes for React + Tailwind

1. Move the `tailwind.config` block into `tailwind.config.ts` `theme.extend` verbatim.
2. The two `<style>` blocks become a single `globals.css` (or `layer1india.css`). The
   `@import` font line moves to the top, or into the Next.js font loader.
3. `.glass-card`, `.step-btn.active`, `.step-btn.locked`, `.heading-silver-shimmer`, and the
   scrollbar rules stay as plain CSS classes — they are not pure Tailwind.
4. `inr-input` is NOT a style — it is a behavior hook. In React, replace it with a
   controlled currency-input component, not a class.
5. The `hidden` panel-switching is the DOM logic XState replaces: render only the active
   panel rather than toggling `hidden`.
6. The two radial-gradient body glows must be reproduced on the app shell wrapper, since
   Next.js does not style `body` the same way by default.
/* ============================================================
   layer1_india.html — extracted CSS (both <style> blocks)
   ============================================================ */

/* ---------- Style block 1 ---------- */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;700;800&display=swap');
    
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: #050505; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(212, 175, 55, 0.4); }

    body {
        font-family: 'Inter', sans-serif;
        background-color: #050505;
        color: #A1A1AA;
        background-image: 
            radial-gradient(circle at top right, rgba(212, 175, 55, 0.03) 0%, transparent 40%),
            radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.02) 0%, transparent 40%);
        background-attachment: fixed;
    }

    .glass-card {
        background-color: rgba(18, 18, 18, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        backdrop-filter: blur(12px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .glass-card:hover {
        border-color: rgba(212, 175, 55, 0.2);
        box-shadow: 0 0 30px rgba(212, 175, 55, 0.05);
    }

    .heading-silver-shimmer {
        background: linear-gradient(90deg, #94A3B8 0%, #F1F5F9 45%, #FFFFFF 50%, #F1F5F9 55%, #94A3B8 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: shimmer-text 5s linear infinite;
        font-weight: 800;
        text-shadow: 0 0 20px rgba(255,255,255,0.05);
    }
    @keyframes shimmer-text { 
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
    }

    .step-btn.active {
        background-color: rgba(212, 175, 55, 0.1);
        border-left: 4px solid #D4AF37;
        color: #FFFFFF;
    }

    .step-btn.locked {
        opacity: 0.35;
        cursor: not-allowed;
    }

/* ---------- Style block 2 ---------- */
@keyframes scan {
    0% { transform: translateY(0); opacity: 0.5; }
    50% { opacity: 1; }
    100% { transform: translateY(96px); opacity: 0.5; }
}
import type { Config } from 'tailwindcss'

// Extracted verbatim from layer1_india.html tailwind.config block
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brandDark: '#0c0c0c',
        brandGray: '#1c1c1c',
        brandGold: '#D4AF37',
        brandRed: '#991B1B',
        brandGreen: '#10B981',
        brandCyan: '#06B6D4',
      },
      letterSpacing: {
        widest: '0.25em',
        header: '0.5em',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}

export default config
