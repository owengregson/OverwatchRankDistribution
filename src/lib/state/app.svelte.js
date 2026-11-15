import { Spring, prefersReducedMotion } from 'svelte/motion';
import iconMetrics from '@/data/iconMetrics.json';
import { SEASONS as BUNDLED_SEASONS, sortSeasons } from '@/data/seasons/index.js';
import { backend } from '@/lib/backend/index.js';
import { createIconSizing } from '@/lib/ladder/iconSizing.js';
import { ladderById, ladderOf } from '@/lib/ladder/ladders.js';
import { clamp } from '@/lib/math/util.js';
import { tryBuildSeasonModel } from '@/lib/model/buildSeasonModel.js';
import { compareReadings, readAt } from '@/lib/model/reading.js';

/**
 * How large to draw each rank icon so they all look the same size. Worked
 * out from today's ladder, which has every tier, so a rank is drawn the
 * same size whichever ladder a season uses.
 */
export const iconSizing = createIconSizing(ladderById(), iconMetrics);

/** A season's ladder, falling back to today's if the season names one that does not exist. */
function ladderFor(season) {
  try {
    return ladderOf(season);
  } catch {
    return ladderById();
  }
}

/** Fits a season on its own ladder: { model, error }. A season that cannot be fitted yields the error. */
function fitSeason(season) {
  try {
    return tryBuildSeasonModel(season, ladderOf(season));
  } catch (error) {
    return { model: null, error };
  }
}

/** Spring feel for the cursor: tight when tracking a pointer, loose when travelling. */
const FOLLOW = { stiffness: 0.34, damping: 0.92 };
const GLIDE = { stiffness: 0.06, damping: 0.6 };
/** Moves shorter than this (SR) are quick hops rather than glides. */
const HOP_DISTANCE = 450;

/**
 * The probe is the point on the SR axis being inspected. It is moved by the
 * pointer, the keyboard and the finder, and animates on a spring so every
 * readout sweeps through the ranks in between.
 */
class Probe {
  #spring = new Spring(0, GLIDE);

  /** Where the probe is heading (whole SR). */
  target = $state(0);
  /**
   * Whether the visitor has picked a point yet (by hovering the chart, the
   * keyboard, the finder, a tier icon or a pin). Until then the chart shows
   * the curve alone, with no cursor on it.
   */
  engaged = $state(false);
  /**
   * The comparison, set with two pins. The first fixes where it starts
   * (`pinnedSr`) and the gap is measured from there to the probe as it
   * moves. The second fixes where it ends (`lockedSr`): the comparison then
   * stays put and the probe is free to roam again.
   */
  pinnedSr = $state(null);
  lockedSr = $state(null);

  /** Animated position, for drawing. */
  get position() {
    return clamp(this.#spring.current, ladder.minSr, ladder.maxSr);
  }

  /** Animated position as a whole SR, for readouts. */
  get sr() {
    return Math.round(this.position);
  }

  #move(sr, feel, instant = false) {
    this.target = clamp(Math.round(sr), ladder.minSr, ladder.maxSr);
    this.#spring.stiffness = feel.stiffness;
    this.#spring.damping = feel.damping;
    this.#spring.set(this.target, { instant: instant || prefersReducedMotion.current });
  }

  /** Track a pointer closely. */
  follow(sr) {
    this.engaged = true;
    this.#move(sr, FOLLOW);
  }

  /** Travel to a point with a visible sweep. */
  glide(sr) {
    this.engaged = true;
    this.#move(sr, GLIDE);
  }

  /**
   * Go to a chosen point: sweep across the ladder for a long trip, but get
   * there almost at once for a short one (such as the next division), where
   * a slow settle would leave the readout lagging behind the choice.
   */
  goTo(sr) {
    this.engaged = true;
    this.#move(sr, Math.abs(sr - this.position) <= HOP_DISTANCE ? FOLLOW : GLIDE);
  }

  /** Move without animating, and without counting as the visitor picking a point. */
  jump(sr) {
    this.#move(sr, FOLLOW, true);
  }

  /** 'idle' with no pins, 'measuring' from the first pin, 'locked' between two. */
  get comparing() {
    if (this.pinnedSr === null) return 'idle';
    return this.lockedSr === null ? 'measuring' : 'locked';
  }

  /**
   * Drop the next pin: the start of a comparison, then its end. A pin
   * dropped on a locked comparison starts a new one.
   */
  pin(sr = this.target) {
    const at = clamp(Math.round(sr), ladder.minSr, ladder.maxSr);
    this.engaged = true;
    if (this.comparing === 'measuring') {
      this.lockedSr = at;
    } else {
      this.pinnedSr = at;
      this.lockedSr = null;
    }
  }

  unpin() {
    this.pinnedSr = null;
    this.lockedSr = null;
  }
}

class AppState {
  /** Seasons, oldest first. Starts as the bundled copy; `refreshSeasons` swaps in live data. */
  seasons = $state(BUNDLED_SEASONS);
  /** The newest season is shown first. */
  seasonId = $state(BUNDLED_SEASONS.at(-1)?.id);
  probe = new Probe();

  // Every season's curve is fitted from its datapoints, on its own ladder.
  // A season that cannot be fitted yields an error instead of breaking the page.
  #fits = $derived(new Map(this.seasons.map((season) => [season.id, fitSeason(season)])));

  /** Seasons with enough data for a curve: the ones visitors can browse. */
  viewableSeasons = $derived(this.seasons.filter((season) => this.#fits.get(season.id).model));
  /**
   * Where those seasons are in the header: each of `tabSeasons` has a tab of
   * its own, and `olderSeasons` (those marked `older`, newest first) share
   * the "Older Seasons" menu. An admin moves a season between the two.
   */
  tabSeasons = $derived(this.viewableSeasons.filter((season) => !season.older));
  olderSeasons = $derived(this.viewableSeasons.filter((season) => season.older).reverse());

  season = $derived(
    this.seasons.find((season) => season.id === this.seasonId) ?? this.viewableSeasons.at(-1) ?? this.seasons.at(-1),
  );

  /** The ladder the season on screen was played on. */
  ladder = $derived(ladderFor(this.season));

  reading = $derived(this.model ? readAt(this.model, this.ladder, this.probe.sr) : null);
  pinnedReading = $derived(
    this.model && this.probe.pinnedSr !== null ? readAt(this.model, this.ladder, this.probe.pinnedSr) : null,
  );
  /** The far end of the comparison once it is locked. */
  lockedReading = $derived(
    this.model && this.probe.lockedSr !== null ? readAt(this.model, this.ladder, this.probe.lockedSr) : null,
  );
  /** What the first pin is compared with: the second pin, or the probe until there is one. */
  comparedReading = $derived(this.lockedReading ?? this.reading);
  comparison = $derived(
    this.pinnedReading ? compareReadings(this.pinnedReading, this.comparedReading, this.ladder) : null,
  );

  /**
   * A page with a rank of its own to show (the one picked on the submit
   * form) puts its tier here, and takes it away when it is left.
   */
  featuredTier = $state.raw(null);
  /**
   * The rank the page is lit in: its colour is the backdrop's glow and every
   * accent (--tier, set in App.svelte). The featured rank when a page has
   * one, otherwise the rank under the chart's cursor.
   */
  accentTier = $derived(this.featuredTier ?? this.reading?.tier ?? null);

  /** The fit for any season: { model, error }. */
  fitOf(season) {
    return this.#fits.get(season.id) ?? fitSeason(season);
  }

  /** The ladder any season was played on. */
  ladderOf(season) {
    return ladderFor(season);
  }

  get model() {
    return this.fitOf(this.season).model;
  }

  get error() {
    return this.fitOf(this.season).error;
  }

  selectSeason(id) {
    this.seasonId = id;
  }

  /**
   * Loads the seasons from the backend. Called on startup and after an admin
   * changes anything, so the curve always reflects the stored datapoints.
   * If the backend cannot be reached the current seasons stay on screen.
   */
  async refreshSeasons() {
    try {
      const live = await backend.listSeasons();
      if (!live.length) return;
      this.seasons = sortSeasons(live);
      // Keep the visitor's season if it still has a curve; otherwise show the newest that does.
      const stillViewable = this.viewableSeasons.some((season) => season.id === this.seasonId);
      if (!stillViewable) this.seasonId = (this.viewableSeasons.at(-1) ?? this.seasons.at(-1)).id;
    } catch (error) {
      console.warn('Could not load live seasons; showing the bundled copy.', error);
    }
  }
}

/**
 * The ladder of the season on screen. It reads through to `app.ladder`, so
 * `ladder.tiers`, `ladder.divisionAt(sr)` and the rest always answer for
 * the current season, and anything reactive that reads them updates when
 * the season changes to one on a different ladder.
 *
 * For another season's ladder (the admin panel and the submit form work on
 * a season of their own choosing) use `app.ladderOf(season)`.
 */
export const ladder = new Proxy({}, { get: (_, key) => app.ladder[key] });

export const app = new AppState();
