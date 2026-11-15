import { Spring, prefersReducedMotion } from 'svelte/motion';
import { LADDER_CONFIG } from '@/data/ladder.js';
import { SEASONS as BUNDLED_SEASONS, sortSeasons } from '@/data/seasons/index.js';
import { backend } from '@/lib/backend/index.js';
import { createLadder } from '@/lib/ladder/createLadder.js';
import { clamp } from '@/lib/math/util.js';
import { tryBuildSeasonModel } from '@/lib/model/buildSeasonModel.js';
import { compareReadings, readAt } from '@/lib/model/reading.js';

export const ladder = createLadder(LADDER_CONFIG);

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
  /** A second, fixed point to compare against, or null. */
  pinnedSr = $state(null);

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
    this.#move(sr, FOLLOW);
  }

  /** Travel to a point with a visible sweep. */
  glide(sr) {
    this.#move(sr, GLIDE);
  }

  /**
   * Go to a chosen point: sweep across the ladder for a long trip, but get
   * there almost at once for a short one (such as the next division), where
   * a slow settle would leave the readout lagging behind the choice.
   */
  goTo(sr) {
    this.#move(sr, Math.abs(sr - this.position) <= HOP_DISTANCE ? FOLLOW : GLIDE);
  }

  /** Move without animating. */
  jump(sr) {
    this.#move(sr, FOLLOW, true);
  }

  pin(sr = this.target) {
    this.pinnedSr = clamp(Math.round(sr), ladder.minSr, ladder.maxSr);
  }

  unpin() {
    this.pinnedSr = null;
  }
}

class AppState {
  /** Seasons, oldest first. Starts as the bundled copy; `refreshSeasons` swaps in live data. */
  seasons = $state(BUNDLED_SEASONS);
  /** The newest season is shown first. */
  seasonId = $state(BUNDLED_SEASONS.at(-1)?.id);
  probe = new Probe();

  // Every season's curve is fitted from its datapoints. A season that
  // cannot be fitted yields an error instead of breaking the page.
  #fits = $derived(new Map(this.seasons.map((season) => [season.id, tryBuildSeasonModel(season, ladder)])));

  /** Seasons with enough data for a curve: the ones visitors can browse. */
  viewableSeasons = $derived(this.seasons.filter((season) => this.#fits.get(season.id).model));

  season = $derived(
    this.seasons.find((season) => season.id === this.seasonId) ?? this.viewableSeasons.at(-1) ?? this.seasons.at(-1),
  );

  reading = $derived(this.model ? readAt(this.model, ladder, this.probe.sr) : null);
  pinnedReading = $derived(
    this.model && this.probe.pinnedSr !== null ? readAt(this.model, ladder, this.probe.pinnedSr) : null,
  );
  comparison = $derived(this.pinnedReading ? compareReadings(this.pinnedReading, this.reading) : null);

  /** The fit for any season: { model, error }. */
  fitOf(season) {
    return this.#fits.get(season.id) ?? tryBuildSeasonModel(season, ladder);
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

export const app = new AppState();
