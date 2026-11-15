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

A season is a list of datapoints: a rank (or an exact SR) and the percentage of players it is better than. Its `model` field says which curve is made from them. Both work on the percentages converted to z-scores, where a bell curve is a straight line.

- **`normal`, the bell curve** (the default). The fit is a weighted least-squares line through the datapoints: two give an exact fit, more give the best fit. SR is limited to 0–5000, so the curve is cut off and renormalised over that range. Use it for community datapoints, which are few, close together and a little noisy.
- **`freeform`, following the data.** A smooth, always-rising curve through every datapoint, so the result has whatever shape the data has and is bell-shaped in between; past the outermost datapoints it carries straight on, like a bell's tails. Use it for a season whose whole distribution is known, with a datapoint at each tier or division boundary. Three things to know:
  - Players the curve puts below 0 SR are counted in the lowest division, and likewise at the top. That is how Bronze 5 comes to hold more players than Bronze 4, which no bell curve can show.
  - It reproduces its source, roughness included: figures rounded to one decimal place give a curve with small bumps where the rounding falls. Bronze divisions are wider than the rest on the SR scale, so a season with datapoints inside Bronze has fewer players per SR there and the curve climbs quickly across the Bronze boundary.
  - Weights only settle disagreements: datapoints at the same SR are averaged by weight, and two that contradict each other (a higher rank, a lower percentage) are averaged into one point between them.

The code is in `src/lib/model`. `buildSeasonModel(season, ladder)` returns `cdf`, `pdf` and `quantile` functions, plus the curve's `mean` and `sd`, and everything on screen is derived from those; nothing outside the fitters knows which curve a season uses. To add another, write a fitter with the same return shape as `fitNormal.js` and register it in `buildSeasonModel.js`.

A published breakdown is turned into datapoints by adding up its shares from the bottom, exactly as published: the datapoint for a rank is the total of everything below it (2026 Season 4 was made this way).

## Managing the data

Day to day, use the admin panel at `/#/admin`:

- **Review queue**: pending submissions, each shown with its rank and exact SR next to what the current curve says there, with the screenshot. Approve (optionally with a weight) or deny.
- **Datapoints**: every datapoint behind a season, as a grid of rank badges. Open one to edit or delete it, or the last tile to add one, and see the fit update. Where a datapoint sits is set with three controls: the rank (a dropdown), the division (a slider, 5 to 1) and the percent through that division (a slider, 0 to 99, the game's rank progress). At 0% it is stored as the rank, above that as the exact SR.
- **Seasons**: add, rename or delete seasons, and choose the ladder each was played on, the curve fitted to it (bell curve, or following the data) and where it is in the header for every visitor: a tab of its own, or in the "Older Seasons" menu. A new season stays hidden from visitors until it has enough datapoints for a curve.

The admin panel is linked from a card under the three steps on the submit page. The card is out of sight until the pointer rests on its place for a second, and goes again five seconds after the pointer leaves it.

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

While developing with the stand-in backend, the browser keeps its own copy of each season. Editing a season file replaces that copy the next time the page loads, along with any changes made to that season in the admin panel.

A season played on an older ladder adds `"ladder": "classic"` (the ladder before Emerald existed). Its rank names are then read on that ladder, where "Silver 5" is 1500 SR and not 1000, and the chart shows that ladder's tiers. Without the field a season is on today's ladder. The ladders are defined in `src/data/ladder.js`.

A season with `"older": true` is listed in the header's "Older Seasons" menu; without the field it has a tab of its own. With a database this is the `older` column of `seasons`, which the admin panel sets. A database made before that column existed needs `supabase/schema.sql` run again to add it; until then every season loads as a tab.

## Submissions and the screenshot reader

The submit page (`/#/submit`) starts with a screenshot of the game's rank screen (the one shown after a match, with "Rank progress" and "Higher ranked than"). The rest of the form is greyed out until there is one. The screenshot is then read on the visitor's own computer and the form filled in from it:

- **The rank**, e.g. "Champion 4".
- **Rank progress**, how far through that division the player is, from 0 to 99%. With the rank it gives an exact SR: Champion 4 at 59% is 4,659 SR. A submission carries that SR, and approving it makes a datapoint at that SR and not at the start of the rank.
- **Higher ranked than**, the share of players the rank beats.

The visitor checks the details, corrects anything misread, and sends it. Whatever could not be read is left for them to fill in.

The reading is done by Tesseract, compiled to WebAssembly, in `src/lib/screenshot`: `ocr.js` runs the engine, `readRankScreen.js` looks at the screen (the whole of it first, then each line it found on its own, and each number once more with only digits allowed, keeping a number when the readings agree), and `parse.js` picks the three facts out of the text and is the part with tests. The engine and its English data are about 7 MB. They are served by this site, never fetched from another server. So that nobody waits for them with a screenshot in hand, every page downloads them in the background once it has opened (after the loading screen, never as part of it), and the submit page starts the engine from them as soon as it is shown. The engine only runs, and only holds memory, while the submit page is open. `scripts/ocrData.js` is the small Vite plugin that puts the data file at a fixed address (`ocr/eng.traineddata.gz`).

It reads the English game client. In another language the form is simply left to fill in by hand.

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
scripts/                   measure-icons (icon sizes), extract-cursors (.cur → PNG), ocrData (the screenshot reader's data file)
supabase/schema.sql        database tables and security rules
src/
  config.js                database connection, author link
  data/ladder.js           the ladders: each one's tiers and SR ranges, plus tier colours, icons, light effects
  data/seasons/            bundled seasons
  lib/model/               datapoints → fitted curve → readings
  lib/screenshot/          reads the rank, rank progress and percentage off a screenshot, in the browser
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

- **Ladder** (a new tier, different SR ranges, colours): `src/data/ladder.js`. It holds every ladder the game has had (`LADDERS`); each season names the one it was played on. When the ladder changes again, add a new entry there and make it `DEFAULT_LADDER`, leaving the old one for the seasons that used it. A database-backed season stores its ladder in the `ladder` column (`supabase/schema.sql`).
- **Rank icons**: replace or add an image in `assets/images`, then run `node scripts/measure-icons.mjs`. The icon files differ in shape and scale, so the site measures how much each one actually covers and scales them to look the same size (`src/lib/ladder/iconSizing.js`).
- **Rank light effects** (glow, streak, rays, sparkles): the `EFFECTS` table and the `RAY` and `STREAK_OPACITY` settings at the top of `src/components/RankAura.svelte`; which tier uses which is `glow` in the ladder.
- **Dropdowns and sliders**: `src/components/Select.svelte` and `Slider.svelte` are the site's own, used in place of the browser's `<select>` and range input. The browser draws a `<select>`'s list outside the page, where it cannot be styled and the system cursor shows.
- **Cursors**: the site draws its own cursor (`src/components/CustomCursor.svelte`), because Chrome swaps any image cursor for the system one wherever it would cross the edge of the page. Size is `CURSOR_SCALE` in `src/lib/cursor/cursors.js`; which elements get the arrow, finger or text bar is `src/styles/cursors.css`. After replacing a `.cur`, run `node scripts/extract-cursors.mjs`.
- **The curve's look**: the curve is painted on a canvas by `src/lib/chart/curveRenderer.js`. Everything worth tuning (how bright the fill, glow and core line are, the hatching, the light around the cursor, the passing sheen) is the `LOOK` table at the top of that file. Its colours come from the ladder: `src/lib/chart/tierRamp.js` blends each tier's colour into its neighbours.
- **Loading screen and opening**: the markup is in `index.html` so it shows before any script runs, the styles are `src/styles/loader.css`, and `src/lib/loader.js` loads the fonts, images and season data, fills the bar and opens the page (timings are in `TIMING` there). The page's own entrance waits for it: see `src/lib/state/intro.svelte.js`. The curve's part of the intro is `INTRO` in `src/components/DistributionChart.svelte`.
- **Logo and favicon**: `assets/images/overwatch_logo_dark_fill.svg` (for light backgrounds, used in the header), `overwatch_logo_light_fill.svg` (for dark backgrounds; a copy is inlined in `index.html` for the loading screen) and `favicon.png`.
- **Theme**: `src/styles/tokens.css`.

## Search engines, articles and link previews

The chart is rendered by JavaScript behind a `#`, which search engines index poorly, so the build also produces plain HTML pages that need no JavaScript:

- **Articles** (`/articles/<slug>/`, listed at `/articles/`): guides to the rank distribution. Each one is a JS module in `scripts/site/articles/` whose numbers come from the bundled seasons, the ladder and the model (`scripts/site/data.js`), never typed in, so they follow the data on every build. Add one by writing a module there and listing it in `scripts/site/articles/index.js`.
- **`sitemap.xml`, `robots.txt`, `site.webmanifest`, `404.html`**, generated alongside. "Last updated" and sitemap dates come from git history, which is why the deploy workflow checks out the full history.
- **Head tags** in `index.html` (description, canonical, Open Graph, Twitter card, JSON-LD) use double-brace placeholders filled in from `site.config.js`.
- **Text summary** at the end of `index.html`: a description of the chart, a table of every rank (filled in from the data at build time) and links to the articles. It is a text version of the chart for screen reader users, who cannot use the canvas, and for visitors without JavaScript, who see it on screen. With JavaScript on it is kept out of sight (`src/styles/summary.css`). Keep it to what those readers need: text hidden from everyone just to feed search engines is against Google's spam policies, while text for screen readers is explicitly allowed.

All of it is done by a small Vite plugin, `scripts/site/vitePlugin.js`: `npm run build` writes the pages into `dist/`, and `npm run dev` serves them too (re-rendered on each request). After a build, `npm run check:site` checks that every internal link and sitemap URL resolves, the JSON-LD parses and each article is in shape; the deploy workflow runs it.

**Production URL.** `site.config.js` holds the address every absolute URL is built from (`https://owengregson.github.io/OverwatchRankDistribution/`). To move to a custom domain, change `url` there and add a `public/CNAME` file. Crawlers only read `robots.txt` at the root of a host, so it takes effect once the site has its own domain; until then, submit the sitemap in Google Search Console.

**Preview image and icons.** `public/og-image.png` (1200×630) and `public/icons/*.png` are drawn from the ladder, the newest season's curve, the fonts and the logo by `npm run images` (no dependencies). Run it again after changing any of those, and commit the results.
