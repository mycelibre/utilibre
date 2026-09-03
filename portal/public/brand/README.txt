Utilibre logo kit
==================

svg/
  utilibre-logo-coral.svg   - primary horizontal logo (icon + wordmark), coral on transparent. Use on light backgrounds.
  utilibre-logo-white.svg   - reversed version, white on transparent. Use on dark or colored backgrounds.
  utilibre-icon-coral.svg   - standalone icon mark, no background. Flexible for social avatars, stamps, etc.
  utilibre-appicon.svg      - icon on a coral rounded-square background. Source for app icons / larger favicons.

png/
  utilibre-logo-coral-1200.png / utilibre-logo-white-1200.png - high-res horizontal logos, transparent background, for docs/slides.
  utilibre-icon-coral-512.png  - standalone icon, transparent background, 512px.
  icon-512.png / apple-touch-icon-180.png - square coral app icons at common sizes.

favicon/
  favicon.ico          - multi-size (16/32/48) icon for <link rel="icon">.
  favicon-16.png, favicon-32.png, favicon-48.png - individual sizes if you need them separately.
  utilibre-appicon-simple.svg - the simplified, no-keyhole vector source used for the small favicon sizes (thicker strokes, keeps it legible at 16-32px).

Notes
-----
- The wordmark is set in Poppins Medium, converted to vector outlines, so the SVGs will render identically everywhere without needing the font installed.
- Coral is #D85A30. The neutral dark used in the wordmark is #2C2C2A.
- For the site's <head>, something like:
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" href="/favicon-32.png" type="image/png">
    <link rel="apple-touch-icon" href="/apple-touch-icon-180.png">
