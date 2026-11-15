/**
 * Supabase adapter: a hosted Postgres database the static site talks to
 * directly from the browser.
 *
 * Who may do what is enforced by the database's row-level security rules in
 * supabase/schema.sql, not by this file: visitors can read seasons and add
 * pending submissions; only signed-in admins can see or change anything else.
 *
 * Column names in the database are snake_case; the app uses camelCase.
 */

/** Private storage bucket holding proof screenshots (created by schema.sql). */
const PROOF_BUCKET = 'proofs';
/** How long an address for viewing a proof stays valid, in seconds. */
const PROOF_URL_LIFETIME = 600;
export function createSupabaseBackend({ url, anonKey }) {
  // The client library is loaded on first use, so the page can paint first.
  let clientPromise;
  const getClient = () =>
    (clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(url, anonKey)));

  /** Supabase returns { data, error } rather than throwing. */
  const unwrap = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };

  const toDatapoint = (row) => ({
    id: row.id,
    ...(row.rank ? { rank: row.rank } : { sr: row.sr }),
    betterThan: Number(row.better_than),
    weight: Number(row.weight),
    note: row.note ?? '',
  });

  const toSeason = (row) => ({
    id: row.id,
    year: row.year,
    number: row.number,
    name: row.name,
    model: row.model,
    ladder: row.ladder,
    datapoints: (row.datapoints ?? []).map(toDatapoint),
  });

  const toSubmission = (row) => ({
    id: row.id,
    seasonId: row.season_id,
    rank: row.rank,
    betterThan: Number(row.better_than),
    proofPath: row.proof_path,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  });

  async function adminSession(client) {
    const { data } = await client.auth.getSession();
    if (!data.session) return null;
    const isAdmin = unwrap(await client.rpc('is_admin'));
    return isAdmin ? { email: data.session.user.email } : null;
  }

  return {
    name: 'supabase',
    canSubmit: true,

    async listSeasons() {
      const client = await getClient();
      const rows = unwrap(
        await client
          .from('seasons')
          .select('id, year, number, name, model, ladder, datapoints(id, rank, sr, better_than, weight, note)'),
      );
      return rows.map(toSeason);
    },

    async submitDatapoint({ seasonId, rank, betterThan, proof }) {
      const client = await getClient();

      // The screenshot goes to private storage first; the submission then points at it.
      const proofPath = `${crypto.randomUUID()}.${proof.extension}`;
      const upload = await client.storage
        .from(PROOF_BUCKET)
        .upload(proofPath, proof.blob, { contentType: proof.blob.type, upsert: false });
      if (upload.error) throw new Error(upload.error.message);

      // No .select(): visitors may add a submission but not read it back.
      unwrap(
        await client
          .from('submissions')
          .insert({ season_id: seasonId, rank, better_than: betterThan, proof_path: proofPath }),
      );
    },

    async getSession() {
      return adminSession(await getClient());
    },

    async signIn(email, password) {
      const client = await getClient();
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error('Wrong email or password.');
      const session = await adminSession(client);
      if (!session) {
        await client.auth.signOut();
        throw new Error('That account is not an admin of this site.');
      }
      return session;
    },

    async signOut() {
      const client = await getClient();
      await client.auth.signOut();
    },

    async listSubmissions(status) {
      const client = await getClient();
      const rows = unwrap(
        await client.from('submissions').select('*').eq('status', status).order('created_at', { ascending: false }),
      );
      return rows.map(toSubmission);
    },

    async getProofUrl(submission) {
      const client = await getClient();
      const { data, error } = await client.storage
        .from(PROOF_BUCKET)
        .createSignedUrl(submission.proofPath, PROOF_URL_LIFETIME);
      if (error) throw new Error(error.message);
      return data.signedUrl;
    },

    async approveSubmission(id, weight = 1) {
      const client = await getClient();
      // One database function, so the datapoint and the status change land together.
      unwrap(await client.rpc('approve_submission', { submission: id, point_weight: weight }));
    },

    async denySubmission(id) {
      const client = await getClient();
      unwrap(
        await client
          .from('submissions')
          .update({ status: 'denied', reviewed_at: new Date().toISOString() })
          .eq('id', id),
      );
    },

    async deleteSubmission(id) {
      const client = await getClient();
      const row = unwrap(await client.from('submissions').select('proof_path').eq('id', id).maybeSingle());
      unwrap(await client.from('submissions').delete().eq('id', id));
      if (row?.proof_path) await client.storage.from(PROOF_BUCKET).remove([row.proof_path]);
    },

    async saveDatapoint(seasonId, datapoint) {
      const client = await getClient();
      const row = {
        season_id: seasonId,
        rank: datapoint.rank ?? null,
        sr: datapoint.sr ?? null,
        better_than: datapoint.betterThan,
        weight: datapoint.weight ?? 1,
        note: datapoint.note || null,
      };
      const table = client.from('datapoints');
      unwrap(await (datapoint.id ? table.update(row).eq('id', datapoint.id) : table.insert(row)));
    },

    async deleteDatapoint(id) {
      const client = await getClient();
      unwrap(await client.from('datapoints').delete().eq('id', id));
    },

    async saveSeason(season, isNew) {
      const client = await getClient();
      const row = { year: season.year, number: season.number, name: season.name, ladder: season.ladder };
      const table = client.from('seasons');
      unwrap(await (isNew ? table.insert({ id: season.id, ...row }) : table.update(row).eq('id', season.id)));
    },

    async deleteSeason(id) {
      const client = await getClient();
      unwrap(await client.from('seasons').delete().eq('id', id));
    },
  };
}
