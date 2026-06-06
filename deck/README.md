# Task402 — Pitch Deck

Slide deck for **Task402**, built with [Slidev](https://sli.dev). Slides live in
`slides.md` as plain Markdown, so editing is just editing text.

## Develop

```bash
npm install
npm run dev      # opens http://localhost:3030 with live reload
```

## Edit

- All content is in `slides.md`. Each `---` starts a new slide.
- Global styling lives in the `<style>` block on the first slide (colors, fonts, helper classes).
- Speaker notes go inside `<!-- ... -->` comments at the end of a slide. Press `p` in the deck to open presenter mode.
- Press `o` for slide overview, `d` to toggle dark mode, `f` for fullscreen.

## Export

```bash
npm run export        # -> slides-export.pdf
npm run export:pptx   # -> PowerPoint (editable in Canva/Keynote/PowerPoint)
npm run build         # -> static site in dist/ (deploy to Vercel)
```

> Tip: exporting to `.pptx` lets you import the deck straight into Canva,
> Google Slides, Keynote or PowerPoint if you want a GUI for final touches.
