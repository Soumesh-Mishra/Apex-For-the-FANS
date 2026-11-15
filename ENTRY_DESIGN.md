# APEX entry redesign

Scope: login and loading/welcome screens. The dashboard and its features retain their existing UI.

Inspiration: [Racing Car World Series Mobile App by Abu Hossain](https://dribbble.com/shots/27192270-Racing-Car-World-Series-Mobile-App). Adapted ideas: near-black surfaces, translucent panels, dominant racing imagery, compact typography, restrained colour accents. The implementation and concept imagery are original.

Review routes:
- `/entry-review`: side-by-side review of all three screens
- `/login?preview=1`: login
- `/loading?mode=transition&preview=1`: transition held at its ready state, with a Play button
- `/loading?mode=welcome&preview=1`: welcome awaiting Continue

Normal `/loading?mode=transition` checks team identity, image readiness and the account endpoint, then navigates to a validated same-origin destination. `/` and welcome mode wait for explicit entry. No artificial loading percentages or minimum delays are used. Resource failures settle into a usable fallback.

Google authentication retains the existing signature, origin, nonce, CSRF and session protections. A Google client ID and secret are still required to enable sign-in.

Assets: `assets/entry/apex-carbon-hero.png` (original) and `assets/entry/apex-carbon-hero.webp` (served, approximately 154 KB). Generated using the built-in image generation tool; WebP encoding uses Pillow at quality 88. This depicts a fictional unbranded carbon Formula-style car, not a current team chassis. Team selection changes APEX accents and official team logo, without misrepresenting the concept photograph as an official livery.

Local asset tooling installed during this task: Windows' Python launcher provisioned Python 3.15.2, and Pillow 13.0.0 was installed from PyPI. The deployed app does not need either at runtime. Figma and Product Design connections were offered but were not confirmed connected.

## Hero generation prompt

Create a premium photorealistic motorsport editorial photograph for a dark Formula racing enthusiast app login page, landscape 3:2. A modern open-wheel Formula-style racing car in neutral glossy black exposed carbon and brushed silver, unbranded and with no sponsor logos, aggressive low front three-quarter view, nose pointing toward lower right, large realistic wide slick tyres, intricate front wing and suspension, cockpit halo, helmeted driver. Car fills the lower middle two-thirds of frame, entirely visible with breathing room at both sides. Dark charcoal pit-lane at night, fine asphalt texture, a few restrained white overhead light streaks and faint tyre haze behind the car. Strong physically plausible hard silver rim light, rich black shadows, realistic carbon fibre and subtle wear, restrained reflections. High contrast cinematic racing photography shot on a full-frame camera with 50mm lens, crisp car against softly blurred deep black background. Broad dark negative space in the upper third for UI headings. Real photographic proportions and material detail, no toy appearance, no illustration, no plastic CGI look, no people outside the car, no interface, no text, no watermarks, no brands, no bright coloured car livery. The result should feel like a professional racing campaign photograph.
