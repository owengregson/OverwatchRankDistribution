# Overwatch Rank Distribution

An interactive competitive rank distribution for Overwatch. Move across the curve to see which rank sits at every percentile, look a rank up by SR, percentile or name, and pin two ranks to compare them.

The curve is never drawn by hand. Each season has a set of small datapoints ("a Master 3 player is better than 97% of players") and the curve is fitted to whatever datapoints that season has. Visitors can submit new datapoints with a screenshot; they count once an admin approves them.

Unofficial fan project, not affiliated with Blizzard Entertainment.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Other commands: `npm run build` (static site into `dist/`), `npm run preview` (serve the build), `npm test` (model and ladder tests).

With no database configured, `npm run dev` uses a stand-in backend that keeps everything in your browser, so the submit page and admin panel work straight away. Open `/#/admin` and sign in with any email and the password `admin`.

## How the curve is made

1. A season is a list of datapoints: a rank (or an exact SR) and the percentage of players it is better than.
2. A bell curve is a straight line once percentages are converted to z-scores, so the fit is a weighted least-squares line through the datapoints. Two datapoints give an exact fit; more give the best fit.
3. SR is limited to 0–5000, so the curve is renormalised over that range.

The code is in `src/lib/model`. `buildSeasonModel(season, ladder)` returns `cdf`, `pdf` and `quantile` functions, and everything on screen is derived from those. To support another curve shape, write a fitter with the same return shape as `fitNormal.js` and register it in `buildSeasonModel.js`; a season picks it with its `model` field.

## Managing the data

Day to day, use the admin panel at `/#/admin`:

- **Review queue**: pending submissions, each shown next to what the current curve says for that rank, with the screenshot. Approve (optionally with a weight) or deny.
- **Datapoints**: every datapoint behind a season. Edit, add or delete, and see the fit update. "Rank or SR" accepts `Master 3` or `3700`.
- **Seasons**: add, rename or delete seasons. A new season stays hidden from visitors until it has enough datapoints for a curve.

`src/data/seasons/*.json` holds a bundled copy of each season. The site shows it for the instant before live data loads, or if the database cannot be reached. Format:

```json
{
  "id": "2026-season-5",
  "year": 2026,
  "number": 5,
  "name": "2026: Season 5",
  "model": "normal",
  "datapoints": [
    { "rank": "Master 3", "betterThan": 97 },
    { "sr": 3800, "betterThan": 98, "weight": 2, "note": "optional" }
  ]
}
```

## Connecting the database (Supabase)

The site is static files, so it can be hosted on GitHub Pages. Submissions, approvals and the live datapoints are stored in a Supabase project that the page talks to directly. What each visitor may do is enforced by the database's row-level security, not by the page.

1. In the Supabase dashboard, open **SQL Editor**, paste all of `supabase/schema.sql` and run it. It creates the tables, the security rules, the private bucket for screenshots, and the first season.
2. Create your admin login: **Authentication → Users → Add user**, with your email, a strong password and "Auto Confirm User" ticked. Then run this in the SQL editor with your email:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

3. Copy the project URL and the `anon` public key from **Project Settings → API** into `src/config.js`. Both are meant to be public.

Never put the database password or the `service_role` key in this repository or in the site. Neither is needed.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` tests, builds and publishes on every push to `main`. One-time setup: repository **Settings → Pages → Source: GitHub Actions**.

## Where things are

```
assets/                    icons, fonts and cursors
scripts/                   measure-icons (icon sizes), extract-cursors (.cur → PNG)
supabase/schema.sql        database tables and security rules
src/
  config.js                database connection, author link
  data/ladder.js           tiers: SR ranges, colours, icons, light effects
  data/seasons/            bundled seasons
  lib/model/               datapoints → fitted curve → readings
  lib/ladder/              tiers and divisions, rank-name parsing
  lib/backend/             storage: Supabase, local stand-in, read-only
  lib/state/               app state (season, model, cursor, pins), the opening sequence
  lib/chart/               chart geometry, the curve's colours and how it is painted
  lib/loader.js            the loading screen: loads assets, shows progress, opens the page
  components/              UI pieces; chart/ holds the chart's layers
  pages/                   the curve, the submit form, the admin panel
  styles/tokens.css        colours, fonts, spacing
  styles/loader.css        the loading screen
tests/                     model and ladder tests
```

Common changes:

- **Ladder** (a new tier, different SR ranges, colours): `src/data/ladder.js`.
- **Rank icons**: replace or add an image in `assets/images`, then run `node scripts/measure-icons.mjs`. The icon files differ in shape and scale, so the site measures how much each one actually covers and scales them to look the same size (`src/lib/ladder/iconSizing.js`).
- **Rank light effects** (glow, streak, rays, sparkles): the `EFFECTS` table and the `RAY` and `STREAK_OPACITY` settings at the top of `src/components/RankAura.svelte`; which tier uses which is `glow` in the ladder.
- **Cursors**: the site draws its own cursor (`src/components/CustomCursor.svelte`), because Chrome swaps any image cursor for the system one wherever it would cross the edge of the page. Size is `CURSOR_SCALE` in `src/lib/cursor/cursors.js`; which elements get the arrow, finger or text bar is `src/styles/cursors.css`. After replacing a `.cur`, run `node scripts/extract-cursors.mjs`.
- **The curve's look**: the curve is painted on a canvas by `src/lib/chart/curveRenderer.js`. Everything worth tuning (how bright the fill, glow and core line are, the hatching, the light around the cursor, the passing sheen) is the `LOOK` table at the top of that file. Its colours come from the ladder: `src/lib/chart/tierRamp.js` blends each tier's colour into its neighbours.
- **Loading screen and opening**: the markup is in `index.html` so it shows before any script runs, the styles are `src/styles/loader.css`, and `src/lib/loader.js` loads the fonts, images and season data, fills the bar and opens the page (timings are in `TIMING` there). The page's own entrance waits for it: see `src/lib/state/intro.svelte.js`. The curve's part of the intro is `INTRO` in `src/components/DistributionChart.svelte`.
- **Logo and favicon**: `assets/images/overwatch_logo_dark_fill.svg` (for light backgrounds, used in the header), `overwatch_logo_light_fill.svg` (for dark backgrounds; a copy is inlined in `index.html` for the loading screen) and `favicon.png`.
- **Theme**: `src/styles/tokens.css`.
