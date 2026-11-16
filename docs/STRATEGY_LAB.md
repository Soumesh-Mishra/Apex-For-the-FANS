# Race Strategy Lab

Open **Race Center → Strategy Lab**. Compare two strategies with zero, one or two pit stops, choose the soft/medium/hard compounds for each stint, and adjust race distance, base lap time, tyre degradation, fuel gain and pit loss. All results are simulations from these inputs. No paid timing feed, Google account or backend connection is required.

The initial example uses the **57-lap** distance in the bundled Bahrain 2024 classification (`data/duel-bahrain-2024.json`). The example pace, tyre offsets, degradation and pit loss are illustrative values, not measured or fitted parameters. Selecting a calendar race changes its context label only: enter the appropriate distance and assumptions yourself. Reset restores the example. The last valid scenario is saved in this device's local storage under `apex-strategy-lab-v1` and is not part of account sync.

## Model

For race lap `L`, using tyre age at the start of that lap:

```text
pace = base + compound_offset + degradation * tyre_age
       - fuel_gain * (L - 1) + safety_car_slowdown_if_active
elapsed += pace + pit_loss_if_stopping_after_this_lap
```

Fresh tyres start at age zero. Tyre age advances by one after a green-flag lap, or by the selected fraction during a safety-car lap. A stop resets age to zero for the following lap. Pit loss is charged exactly once, after the selected lap. Pit laps must be integers, strictly increasing and before the final lap.

The optional hypothetical safety-car window is inclusive of its first and last laps. It adds the selected slowdown to both strategies, scales tyre wear, and reduces pit loss by the selected factor for stops after laps inside the window. This is a hypothetical scenario, not a prediction of a safety car.

The cumulative chart plots **B elapsed minus A elapsed**. Positive values mean B is behind A; negative values mean B is ahead. A is the zero baseline. The lap slider inspects pace, tyre age, pit loss and elapsed time without changing the model inputs.

**Find fastest B pit laps** searches every valid integer pit-lap combination while holding B's compounds and stop count fixed. It reports the best choice inside this model, not an optimal real-world strategy. It allows single-lap stints and does not validate race regulations or available tyre sets.

## Limits

The model supports 5–100 race laps. It does not simulate traffic, overtaking, tyre temperature, weather, red flags, track evolution, driver differences or tyre-allocation/regulatory constraints. Tyre degradation is linear and fuel gain is constant per completed race lap. All results should be interpreted as sensitivity comparisons under chosen assumptions.

Invalid inputs hide the comparison and disable export/optimisation; the last valid scenario remains saved. CSV export in the browser contains one row per simulated lap, including compound, pace, pit loss, elapsed time, gap and safety-car state. It is a simulation export, not an official classification. The standalone Android WebView runs the model offline but labels CSV download as browser-only.

## Verification

`node scripts/test-strategy.mjs` checks race-time sums against hand-calculated results, fresh-tyre resets, pit accounting, fuel gain, safety-car boundaries and wear, signed gaps, exhaustive pit search against an independent closed-form calculation, invalid inputs and CSV row consistency. The full project suite includes these checks. Android instrumentation also checks model rendering, optimisation and safety-car controls without a hosted backend.
