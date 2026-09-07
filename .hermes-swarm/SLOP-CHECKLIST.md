# AI-Slop / Vibe-Coded Website Detection Checklist

Distilled from 2026 research: prg.sh "Why Your AI Keeps Building the Same Purple
Gradient Website", sailop.com 21-sign method + 7-dimension slop guide, 925studios
"AI Slop Design Tells", thefountaininstitute "7 Signs a UI Has Been Vibe Coded",
slopdar.com field guides, solodesign.cc 50-rule detector. Use this as the audit
rubric. A single hit is not slop; a CLUSTER of defaults is.

## A. Color
- A1 Purple/indigo/blue-gradient band: #3b82f6, #8b5cf6, #4f46e5, #6d28d9, #7c3aed,
  #a78bfa, #c084fc and linear-gradients between them (the #1 AI tell, hue 200-290deg)
- A2 Gradient used decoratively: buttons, hero text, borders, badges
- A3 Glassmorphism: backdrop-filter: blur() on nav/modals/cards, translucent white
  surfaces (rgba(255,255,255,0.04-0.1)) + hairline white borders (rgba(255,255,255,0.06-0.12))
- A4 Pure #fff text on pure #000 background (no warm/cool off-black)
- A5 Colored glow shadows: box-shadow with saturated color alpha (0 4px 14px rgba(accent,0.3))
- A6 "Safe" emerald green accent reached for after purple was banned

## B. Typography
- B1 Inter / Roboto / Poppins / DM Sans / Montserrat / Geist as the sole unchosen font
- B2 Mono/code font on body copy
- B3 One font everywhere, no pairing, uniform letter-spacing across hierarchy
- B4 text-5xl font-bold tracking-tight default headline styling

## C. Layout
- C1 Three identical rounded cards in a row (rounded-2xl + shadow-md, icon/heading/paragraph)
- C2 Canonical section order: nav>hero>features>testimonials>pricing>faq>cta>footer
- C3 Centered eyebrow pill with sparkle/rocket emoji above the headline
- C4 max-w-7xl mx-auto on every container; uniform py-20/py-24 section spacing
- C5 rounded-full pills for every control; same radius on every element

## D. Motion
- D1 opacity:0 + translateY(20px) + ease-in-out fade-up on scroll (83% of AI pages)
- D2 animate-pulse on "popular" card/tier
- D3 Linear stagger: every child delayed exactly 0.1s
- D4 Spring/bounce cubic-bezier(0.34,1.56,0.64,1) on everything
- D5 No prefers-reduced-motion guard
- D6 No :active states, :hover only

## E. Components
- E1 shadcn/ui class soup; Tailwind default utilities unmodified (bg-blue-500, rounded-2xl)
- E2 Lucide/Feather thin-line icons everywhere, interchangeable
- E3 Terminal mockup with three traffic-light dots
- E4 Emoji used as UI icons
- E5 Pill badges bg-blue-100 text-blue-800 pattern

## F. Copy
- F1 "Get started", "Effortlessly", "Seamlessly", "Streamline your workflow",
  "Unlock the power of", "Build faster. Ship smarter.", "Welcome to", "AI-powered",
  "Dive into", "Jump into", "Enjoy" filler
- F2 Weightless headlines that could describe any product

## G. Code smells of vibe coding
- G1 Duplicate/conflicting selectors, dead CSS nobody references
- G2 transition: all; !important wars; !important as the only mechanism
- G3 Magic numbers everywhere, no tokens
- G4 Dead JS: unused functions, empty catches that swallow errors, console.log spam
- G5 Copy-paste components with 1-2 word renames
- G6 Features claimed but not implemented (fake buttons, score that never updates)

## Scoring
Each hit = 1 point (severe cluster hits = 2). 0-4: fine. 5-9: sloppy, clean up.
10+: reads as AI-generated. The fix is always: make a deliberate decision where
the default sat. For this repo the design law is AGENTS.md + Leo's preferences:
FLAT solid colors, NO gradients, NO glass/blur, NO neon/glow shadows, solid
surface colors, black buttons, cyan/teal accent (never green), no emoji UI.
