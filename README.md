# Praxis W pattern studio

A personal, logo-focused fork of [Mozayk](https://github.com/stellanjoh2/mozayk) for exploring patterns and business cards with the supplied Praxis W mark.

## Use it

```sh
npm ci
npm run dev
```

The new studio is at `/`. The original Mozayk editor remains at `/mosaic.html`.

To create a portable, offline editor:

```sh
npm run build:standalone
```

Open `downloads/praxisw-pattern-studio.html` in a browser. It includes the app, styling and logo, with no installation or server required. The original Mozayk editor is linked separately in this portable version.

## Features

- Six logo-based pattern families: nested petal fans, leaf weave, four-leaf blooms, leaf ribbons, mirrored petal lattice, and the complete logo.
- Six curated starting studies; deterministic exploration with the original palette retained.
- Pattern scale, shape size, nesting, turn, and seeded variation.
- Editable plum, eucalyptus and paper colours, plus monochrome and inverted palettes.
- Live 85 × 55 mm card preview with left/right/full pattern coverage, crop controls and original logo placement.
- Undo/redo, 12 favourites stored locally, autosaved current settings, and portable JSON projects.
- SVG pattern export, a seamless SVG repeat tile, a card SVG with optional 3 mm bleed, and 2400 px PNG exports.
- Responsive layout and labelled keyboard-accessible controls. Real-device touch behaviour still needs a phone check.

Every decorative path is one of the three exact paths from `praxisw-logo-13.svg`. Paths are nested, rotated, scaled and repeated, never replaced with an approximation. Exported SVGs contain no raster artwork or external assets.

## Exports

The card trim is **85 × 55 mm**. With 3 mm bleed the artboard is **91 × 61 mm** and the trim area is the central 85 × 55 mm. No crop marks are added. Colours are sRGB; final CMYK conversion should use the printer's profile.

Tile export contains one complete repeat. Pattern scale controls its output dimensions. Card crop offsets are a preview-placement choice and are intentionally not baked into the repeat tile.

Downloads happen in the browser; designs are not sent to a server. Browser storage can be cleared, so download a project to preserve important designs. Local-file storage behaviour can vary by browser.

## Development

```sh
npm run test:praxisw
npm run build
npm run lint
npm run build:standalone
```

The focused tests verify deterministic output, project round trips, invalid input handling, exact logo paths, card/bleed dimensions, and matching cell geometry across both repeat boundaries for every family.

## Source and notices

Created as a personal fork of Mozayk by Stellan Johansson. Upstream's source is publicly viewable but described as **all rights reserved**, not under an open-source licence. This fork preserves the upstream notices; it does not relicense the upstream work. See [UPSTREAM_README.md](UPSTREAM_README.md) and [CREDITS.md](CREDITS.md).

The Praxis W mark is supplied by the user for this project. The new studio lives in `src/praxisw/`; the upstream editor is retained separately. The original deployment domain has been removed from the fork.
