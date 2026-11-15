import { Spring, prefersReducedMotion } from 'svelte/motion';
import { LADDER_CONFIG } from '@/data/ladder.js';
import { SEASONS as BUNDLED_SEASONS, sortSeasons } from '@/data/seasons/index.js';
import { backend } from '@/lib/backend/index.js';
import { createLadder } from '@/lib/ladder/createLadder.js';
import { clamp } from '@/lib/math/util.js';
import { buildSeasonModel } from '@/lib/model/buildSeasonModel.js';
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

  season = $derived(this.seasons.find((season) => season.id === this.seasonId) ?? this.seasons.at(-1));

  // The model is always derived from the season's datapoints; a bad season
  // file surfaces as `error` instead of breaking the page.
  #fit = $derived.by(() => {
    try {
      return { model: buildSeasonModel(this.season, ladder), error: null };
    } catch (error) {
      return { model: null, error };
    }
  });

  reading = $derived(this.model ? readAt(this.model, ladder, this.probe.sr) : null);
  pinnedReading = $derived(
    this.model && this.probe.pinnedSr !== null ? readAt(this.model, ladder, this.probe.pinnedSr) : null,
  );
  comparison = $derived(this.pinnedReading ? compareReadings(this.pinnedReading, this.reading) : null);

  get model() {
    return this.#fit.model;
  }

  get error() {
    return this.#fit.error;
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
      const hadSelection = live.some((season) => season.id === this.seasonId);
      this.seasons = sortSeasons(live);
      if (!hadSelection) this.seasonId = this.seasons.at(-1).id;
    } catch (error) {
      console.warn('Could not load live seasons; showing the bundled copy.', error);
    }
  }
}

export const app = new AppState();
