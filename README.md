<p align="center">
  <a href="https://owengregson.github.io/OverwatchRankDistribution/">
    <img src="docs/readme/banner.png" alt="Overwatch Rank Distribution. Where do you stand?" width="100%">
  </a>
</p>

<p align="center">
  <a href="https://owengregson.github.io/OverwatchRankDistribution/"><b>PLAY IT LIVE</b></a>
  &nbsp;·&nbsp;
  <a href="https://owengregson.github.io/OverwatchRankDistribution/articles/">GUIDES</a>
  &nbsp;·&nbsp;
  <a href="#run-it">RUN IT</a>
  &nbsp;·&nbsp;
  <a href="#the-curve">THE CURVE</a>
  &nbsp;·&nbsp;
  <a href="#go-live">GO LIVE</a>
  &nbsp;·&nbsp;
  <a href="docs/DETAILS.md">DEEP DIVE</a>
</p>

See where any Overwatch rank sits among every player. Move along the curve, look a rank up, pin two to compare.

Unofficial fan project, not affiliated with Blizzard Entertainment.

<img src="docs/readme/features.png" alt="1 Explore: every rank, every percentile. 2 Find: look up any SR, percent or rank. 3 Compare: pin two ranks, measure the gap. 4 Submit: send a screenshot, sharpen the curve." width="100%">

<img src="docs/readme/tiers.png" alt="Share of players in each rank for the newest season, Bronze to Champion, as a bar chart with the rank icons." width="100%">

<a name="run-it"></a>
<img src="docs/readme/section-run.png" alt="01 Run it" width="100%">

```bash
npm install
```

```bash
npm run dev
```

Dev talks to the same database as the live site (`src/config.js`). Empty `anonKey` there and it keeps everything in your browser instead: admin at `/#/admin`, any email, password `admin`.

| Command | What it does |
| --- | --- |
| `npm run build` | Static site into `dist/` |
| `npm run preview` | Serve the build |
| `npm test` | Model, ladder and screenshot reader tests |
| `npm run images` | Redraw every generated image, this page's included |
| `npm run check:site` | Check the built site's links and pages |

<a name="the-curve"></a>
<img src="docs/readme/section-curve.png" alt="02 The curve" width="100%">

- **Fitted, never drawn.** Each season's curve is worked out from figures for that season: published ones, and rank screens players send in.
- **Two fits.** `normal` is the best-fit bell curve, for a few noisy community figures. `freeform` follows the figures closely, for a season whose whole distribution was published.
- **A bell tail above 99%.** The game's own figure stops at 99%, so the top 1% is always a bell tail.

Each season also says which ladder it was played on (today's, or the one before Emerald existed) and whether it has a tab of its own or sits under **Older Seasons**. Both are set in the admin panel. The fits are covered in the [DEEP DIVE](docs/DETAILS.md).

<a name="submissions"></a>
<img src="docs/readme/section-submissions.png" alt="03 Submissions" width="100%">

1. **Drop a screenshot** of the game's rank screen on `/#/submit`.
2. **It is read on your device.** Rank, rank progress and "higher ranked than" fill in the form, and the role is noted without asking. Nothing is uploaded until you send it.
3. **An admin approves it** and the curve refits.

The reader is Tesseract in WebAssembly, served by the site itself. It reads the English game client. Anything it misses, you type.

<a name="admin"></a>
<img src="docs/readme/section-admin.png" alt="04 Admin" width="100%">

Everything is managed at `/#/admin`.

| Tab | What you do there |
| --- | --- |
| **Review queue** | Approve or deny submissions, each beside its screenshot and the curve's own figure |
| **Datapoints** | A grid of rank badges. Open one to set its rank, division, percent and share |
| **Seasons** | Add, rename, delete. Pick the ladder, the fit, and tab or Older Seasons |

<a name="go-live"></a>
<img src="docs/readme/section-live.png" alt="05 Go live" width="100%">

**Database (Supabase).** Stores submissions, approvals and live datapoints. Without it the site shows the bundled seasons and hides the submit page. To set up a new one:

1. Run all of `supabase/schema.sql` in the SQL editor.
2. Add a user under **Authentication → Users**, then make it an admin:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

3. Put the project URL and the `anon` key in `src/config.js`. Both are public by design.

Never commit the database password or the `service_role` key. Neither is needed.

**Hosting (GitHub Pages).** Push to `main`. The workflow tests, builds and publishes. One-time setup: **Settings → Pages → Source: GitHub Actions**.

<a name="map"></a>
<img src="docs/readme/section-map.png" alt="06 Map" width="100%">

```
src/data/ladder.js       the ladders: tiers, SR ranges, colours, icons
src/data/seasons/        bundled seasons
src/lib/model/           datapoints → fitted curve → readings
src/lib/screenshot/      the screenshot reader
src/lib/backend/         storage: Supabase, local stand-in, read-only
src/components/          UI pieces; chart/ holds the chart's layers
src/pages/               the curve, the submit form, the admin panel
src/styles/tokens.css    colours, fonts, spacing
scripts/                 image drawing, article pages, build helpers
supabase/schema.sql      database tables and security rules
tests/                   model, ladder and screenshot reader tests
```

Want more? **[DEEP DIVE](docs/DETAILS.md)** covers the fits in depth, the screenshot reader, common changes, and search engines and link previews.

<p align="center"><sub>Every picture on this page is drawn by <code>npm run images</code> from the site's own ladder, seasons, fonts, rank icons and logo.</sub></p>
