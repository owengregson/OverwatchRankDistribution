/**
 * Development stand-in for the real backend. Everything lives in this
 * browser's localStorage, seeded from the bundled seasons, so the submit and
 * admin flows can be built and tried without a database.
 *
 * Sign in with any email and the password below. Never used on the
 * published site (see ./index.js).
 */
const STORAGE_KEY = 'rank-distribution:local-backend';
export const LOCAL_ADMIN_PASSWORD = 'admin';

/** Pretend network delay, so loading states are visible while developing. */
const LATENCY_MS = 250;
const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

/** Images are kept as data: URLs, since localStorage only holds text. */
const toDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.readAsDataURL(blob);
  });

export function createLocalBackend(bundledSeasons) {
  /** A bundled season as this backend stores it: every datapoint has an id. */
  const seed = (season) => ({
    ...season,
    datapoints: season.datapoints.map((point) => ({ id: crypto.randomUUID(), ...point })),
  });

  /** A bundled season file's contents as text, to tell when the file has been edited. */
  const contentsOf = (season) => JSON.stringify(season);

  function load() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      // Corrupt data: start again from the bundled seasons.
    }
    if (!saved?.seasons) {
      return {
        seasons: bundledSeasons.map(seed),
        /** Ids of the bundled seasons that have been copied in, so each is only ever copied once. */
        seeded: bundledSeasons.map((season) => season.id),
        /** Each bundled season file as it was when last copied in, by id. */
        files: Object.fromEntries(bundledSeasons.map((season) => [season.id, contentsOf(season)])),
        submissions: [],
        /** Proof images by path. */
        proofs: {},
        session: null,
      };
    }

    // A season file added to the project since this browser's data was
    // saved is copied in. One the admin has since deleted is not brought
    // back: `seeded` remembers it was already copied. (Data saved before
    // `seeded` existed counts the seasons it holds as the ones copied.)
    //
    // A season file edited since it was copied replaces the copy here, so
    // the file is what shows; changes made to that season in the admin
    // panel are dropped. (Data saved before `files` existed cannot tell,
    // and takes every file once.)
    const db = { proofs: {}, seeded: saved.seasons.map((season) => season.id), files: {}, ...saved };
    for (const season of bundledSeasons) {
      const contents = contentsOf(season);
      const edited = db.files[season.id] !== contents;
      db.files[season.id] = contents;

      const at = db.seasons.findIndex((existing) => existing.id === season.id);
      if (!db.seeded.includes(season.id)) {
        db.seeded.push(season.id);
        if (at < 0) db.seasons.push(seed(season));
      } else if (edited && at >= 0) {
        db.seasons[at] = seed(season);
      }
    }
    return db;
  }

  const db = load();
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      throw new Error("This browser's local storage is full. Delete some submissions in the admin panel.");
    }
  };

  /** Wraps an operation with the fake delay, an optional admin check, and a save. */
  const operation =
    (run, { admin = false } = {}) =>
    async (...args) => {
      await wait();
      if (admin && !db.session) throw new Error('Sign in as an admin first.');
      const result = await run(...args);
      save();
      // Hand back copies so callers cannot mutate the stored data.
      return result === undefined ? undefined : structuredClone(result);
    };

  const findSeason = (id) => {
    const season = db.seasons.find((s) => s.id === id);
    if (!season) throw new Error(`Unknown season "${id}".`);
    return season;
  };
  const findSubmission = (id) => {
    const submission = db.submissions.find((s) => s.id === id);
    if (!submission) throw new Error('That submission no longer exists.');
    return submission;
  };

  return {
    name: 'local',
    canSubmit: true,

    listSeasons: operation(() => db.seasons),

    submitDatapoint: operation(async ({ seasonId, rank, sr = null, betterThan, proof }) => {
      findSeason(seasonId);
      const proofPath = `${crypto.randomUUID()}.${proof.extension}`;
      db.proofs[proofPath] = await toDataUrl(proof.blob);
      db.submissions.push({
        id: crypto.randomUUID(),
        seasonId,
        rank,
        sr,
        betterThan,
        proofPath,
        status: 'pending',
        createdAt: new Date().toISOString(),
        reviewedAt: null,
      });
    }),

    getSession: async () => db.session,

    signIn: operation((email, password) => {
      if (password !== LOCAL_ADMIN_PASSWORD) throw new Error('Wrong email or password.');
      db.session = { email };
      return db.session;
    }),

    signOut: operation(() => {
      db.session = null;
    }),

    listSubmissions: operation(
      (status) =>
        db.submissions
          .filter((s) => s.status === status)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      { admin: true },
    ),

    getProofUrl: operation(
      (submission) => {
        const url = db.proofs[submission.proofPath];
        if (!url) throw new Error('That proof image no longer exists.');
        return url;
      },
      { admin: true },
    ),

    approveSubmission: operation(
      (id, weight = 1) => {
        const submission = findSubmission(id);
        if (submission.status !== 'pending') throw new Error('That submission was already reviewed.');
        // A submission that says how far through the division it was becomes a datapoint at that exact SR.
        const exact = submission.sr !== null && submission.sr !== undefined;
        findSeason(submission.seasonId).datapoints.push({
          id: crypto.randomUUID(),
          ...(exact ? { sr: submission.sr } : { rank: submission.rank }),
          betterThan: submission.betterThan,
          weight,
          note: exact ? `Community submission (${submission.rank})` : 'Community submission',
        });
        submission.status = 'approved';
        submission.reviewedAt = new Date().toISOString();
      },
      { admin: true },
    ),

    denySubmission: operation(
      (id) => {
        const submission = findSubmission(id);
        submission.status = 'denied';
        submission.reviewedAt = new Date().toISOString();
      },
      { admin: true },
    ),

    deleteSubmission: operation(
      (id) => {
        delete db.proofs[findSubmission(id).proofPath];
        db.submissions = db.submissions.filter((s) => s.id !== id);
      },
      { admin: true },
    ),

    saveDatapoint: operation(
      (seasonId, datapoint) => {
        const season = findSeason(seasonId);
        const index = season.datapoints.findIndex((p) => p.id === datapoint.id);
        if (index >= 0) season.datapoints[index] = datapoint;
        else season.datapoints.push({ ...datapoint, id: crypto.randomUUID() });
      },
      { admin: true },
    ),

    deleteDatapoint: operation(
      (id) => {
        for (const season of db.seasons) {
          season.datapoints = season.datapoints.filter((p) => p.id !== id);
        }
      },
      { admin: true },
    ),

    saveSeason: operation(
      (season, isNew) => {
        const { datapoints, ...fields } = season;
        if (isNew) {
          if (db.seasons.some((s) => s.id === fields.id)) throw new Error(`Season "${fields.id}" already exists.`);
          db.seasons.push({ model: 'normal', ...fields, datapoints: [] });
        } else {
          Object.assign(findSeason(fields.id), fields);
        }
      },
      { admin: true },
    ),

    deleteSeason: operation(
      (id) => {
        db.seasons = db.seasons.filter((s) => s.id !== id);
        for (const submission of db.submissions.filter((s) => s.seasonId === id)) {
          delete db.proofs[submission.proofPath];
        }
        db.submissions = db.submissions.filter((s) => s.seasonId !== id);
      },
      { admin: true },
    ),
  };
}
