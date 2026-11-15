# APEX team colours: 2026

All 11 current teams are included. Primary accents below were read directly from the `--f1-team-colour` property on [Formula 1's team cards](https://www.formula1.com/en/teams), retrieved 11 November 2026. The full provenance is in `data/team-colour-reference.json`.

Supporting colours are APEX's interpretation of the regular team/livery aesthetic, not claimed official paint, Pantone or brand-manual specifications. Each livery reference is retained in `data/team-aesthetics.json`. One-off race liveries are intentionally not separate themes.

| Team | F1 primary accent | Supporting aesthetic used in APEX |
| --- | --- | --- |
| Alpine | `#00A1E8` | Pink detailing, blue-tinted carbon surfaces |
| Aston Martin | `#229971` | Lime detailing, deep green surfaces |
| Audi | `#FF2D00` | Titanium-inspired silver, carbon black |
| Cadillac | `#AAAAAD` | White and black, restrained monochrome |
| Ferrari | `#E8002D` | White detailing, warm carbon surfaces |
| Haas F1 Team | `#DEE1E2` | White-led identity, red keylines, black surfaces |
| McLaren | `#FF8000` | Papaya, anthracite and a small teal highlight |
| Mercedes | `#27F4D2` | Petronas green, silver, cool black surfaces |
| Racing Bulls | `#6692FF` | Lighter blue, white detailing, ink-blue surfaces |
| Red Bull Racing | `#3671C6` | Deeper blue, yellow and red highlights |
| Williams | `#1868DB` | Blue, white and a small heritage-red keyline |

The application derives dark surfaces and hover states from each palette. Button labels choose a light or dark foreground, and accent text is lightened only as needed to reach at least 4.5:1 contrast on the application's three principal dark surfaces. The original F1 primary remains the button/swatch colour and is displayed as a hex value on each team card.

Race flags, tyre compounds and historical drivers keep their data colours. Current standings use the verified current-team accents. Team choice is local to the browser, restores before first paint, supports legacy saved team names, syncs across tabs and can be reset to APEX Original. If browser storage is unavailable, the current-page theme still works.

Checks: `node scripts/test-team-themes.mjs` tests the complete roster, every primary value, contrast for all 11 teams plus APEX, legacy preferences, invalid preferences and unavailable storage. Browser checks cover each team button, reload persistence, the quick picker, mobile layout, historical replay colour preservation and reset.
