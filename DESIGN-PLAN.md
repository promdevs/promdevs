# PromDevs Agency Website Planning

## Agreed technical direction

- Keep Next.js.
- Production hosting: existing Hetzner server with Coolify.
- During development, retain the current Vercel setup.
- Fetch published project content from the future PromDevs backend.

## Background direction

Confirmed for future design exploration on 2026-09-15.

Reference: https://flatwhitestudios.com/
Stylesheet: https://flatwhitestudios.com/assets/css/main.css

The reference layers a repeating grain texture over a static CSS gradient.
Adapt this effect to near-black and charcoal for PromDevs, with faint grain
and subtle tonal depth. Avoid a completely flat black surface or the
reference's pink/purple palette.

Starting palette to test visually:

- Base: #080808
- Charcoal: #222222
- Text: off-white
- Small brand accents: #2563eb

Implementation direction: create an original small, seamless transparent
noise texture and layer it over a CSS gradient. No WebGL or animation library
is required for this background. Keep grain subtle enough for readable text.
The exact gradient, texture opacity, and coverage remain to be tested.

## Broader redesign intent

Build a distinctive, polished agency website with new typography, stronger
project presentation, responsive layouts, and SEO-conscious page structure.
Fonts and full art direction are not yet selected. This note records planning
only; it does not apply the background to the current website.
