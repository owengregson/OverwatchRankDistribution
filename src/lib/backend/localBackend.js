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
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.seasons) return { proofs: {}, ...saved };
    } catch {
      // Corrupt or missing data: start again from the bundled seasons.
    }
    return {
      seasons: bundledSeasons.map((season) => ({
        ...season,
        datapoints: season.datapoints.map((point) => ({ id: crypto.randomUUID(), ...point })),
      })),
      submissions: [],
      /** Proof images by path. */
      proofs: {},
      session: null,
    };
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

    submitDatapoint: operation(async ({ seasonId, rank, betterThan, proof }) => {
      findSeason(seasonId);
      const proofPath = `${crypto.randomUUID()}.${proof.extension}`;
      db.proofs[proofPath] = await toDataUrl(proof.blob);
      db.submissions.push({
        id: crypto.randomUUID(),
        seasonId,
        rank,
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
        findSeason(submission.seasonId).datapoints.push({
          id: crypto.randomUUID(),
          rank: submission.rank,
          betterThan: submission.betterThan,
          weight,
          note: 'Community submission',
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
