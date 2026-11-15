# Driver Duel

Open Race Center → Driver Duel, or `/index.html?duel=1#timing`. Historical race cards also offer a Driver duel action.

Choose a season, load a completed Grand Prix and select two different drivers. Compare results, starting grid, classification gains, points, qualifying, representative race pace, fastest recorded laps and pit-stop counts. Switch between lap-time and position charts; click the chart or use the keyboard-accessible lap slider. The expandable table provides the underlying timed laps. Tyre bars show recorded compounds and lap ranges, without filling gaps in the source data.

## Data and interpretation

- Jolpica F1 supplies race classification, qualifying, pit stops and lap history. Its 100-item response limit is paginated for driver lap histories and pit stops.
- OpenF1 supplies tyre stints for historical races from 2023 onward. This first version requests tyre data only for races at least two days old, avoiding live session access. Sessions are matched by race date; unavailable data is explicitly marked.
- The initial Leclerc/Sainz duel uses a bundled, verified 2024 Bahrain snapshot. Its metadata records capture time and original source URLs. The snapshot includes all classifications, qualifying and tyre stints, and full lap history for those two drivers. Other comparisons load archive data through the app's server.
- Qualifying compares each driver's best recorded time in their latest shared qualifying phase (Q3, otherwise Q2, otherwise Q1).
- Representative pace excludes lap 1, known pit laps and the next lap, then laps slower than 115% of each driver's preliminary median. The final median uses only lap numbers eligible for both drivers, with at least five shared laps. It is descriptive; it does not adjust for fuel, weather, traffic, tyre age or safety cars.
- Positions gained means starting-grid position minus final classification, not an overtake count. Pit-lane starts have no grid-gain estimate. A retirement remains labelled even when the driver receives a numeric classification.
- No overall driver rating or strategy prediction is inferred. Missing qualifying, lap, stop or tyre data stays unavailable rather than becoming zero.

## Resilience and privacy

Stale requests cannot replace a newer selection. Lap and tyre data are cached within the page. The bundled Bahrain comparison remains available when archives fail. Driver options are alphabetical; results, charts, tyre stints and lap tables follow the existing spoiler-free protection. No account or paid live-data subscription is needed for this historical feature.

## Validation

`node scripts/test-duel.mjs` checks time conversion, qualifying phases, filtering, shared pace, data gaps, pagination, request validation and offline fallbacks. Browser checks cover swapping, chart modes, lap inspection, an early retirement, archive navigation, spoiler protection, and 390px/320px layouts.
