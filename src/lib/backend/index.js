/**
 * The backend: where seasons, datapoints and submissions are stored.
 *
 * The rest of the app only talks to `backend`, never to a particular service,
 * so swapping the storage means writing one adapter with this shape:
 *
 *   name              'supabase' | 'local' | 'static'
 *   canSubmit         whether visitors can submit datapoints
 *
 *   Public
 *   listSeasons()                         → Season[] (with their datapoints)
 *   submitDatapoint({ seasonId, rank, betterThan, proof })   proof is a prepared image (lib/image.js)
 *
 *   Admin (rejects unless signed in as an admin)
 *   getSession()                          → { email } | null
 *   signIn(email, password)               → { email }
 *   signOut()
 *   listSubmissions(status)               → Submission[], newest first
 *   getProofUrl(submission)               → address of its proof image, for showing to the admin
 *   approveSubmission(id, weight)         adds it to the season's datapoints
 *   denySubmission(id)
 *   deleteSubmission(id)                  also deletes its proof image
 *   saveDatapoint(seasonId, datapoint)    insert, or update when it has an id
 *   deleteDatapoint(id)
 *   saveSeason(season, isNew)
 *   deleteSeason(id)
 *
 * Shapes
 *   Season      { id, year, number, name, model, datapoints: Datapoint[] }
 *   Datapoint   { id?, rank? | sr?, betterThan, weight?, note? }   betterThan is 0–100
 *   Submission  { id, seasonId, rank, betterThan, proofPath, status, createdAt, reviewedAt }
 *               status is 'pending' | 'approved' | 'denied'
 */
import { SUPABASE } from '@/config.js';
import { SEASONS as BUNDLED_SEASONS } from '@/data/seasons/index.js';
import { createLocalBackend } from './localBackend.js';
import { createStaticBackend } from './staticBackend.js';
import { createSupabaseBackend } from './supabaseBackend.js';

function chooseBackend() {
  if (SUPABASE.url && SUPABASE.anonKey) return createSupabaseBackend(SUPABASE);
  // No database configured: a browser-only stand-in while developing,
  // read-only bundled data on the published site.
  return import.meta.env.DEV ? createLocalBackend(BUNDLED_SEASONS) : createStaticBackend(BUNDLED_SEASONS);
}

export const backend = chooseBackend();

export const SUBMISSION_STATUSES = ['pending', 'approved', 'denied'];
