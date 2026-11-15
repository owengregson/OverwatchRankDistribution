/**
 * Site configuration.
 *
 * SUPABASE connects the site to its database (submissions, approvals and the
 * model's datapoints). Both values come from the Supabase dashboard under
 * Project Settings → API. They are public by design: the "anon" key only
 * allows what the database's row-level security rules allow (see
 * supabase/schema.sql), so it is safe to commit and ship.
 *
 * While these are empty, the published site shows the seasons bundled in
 * src/data/seasons and hides the submit page; `npm run dev` uses a stand-in
 * backend that keeps its data in the browser.
 */
export const SUPABASE = {
  url: '',
  anonKey: '',
};

export const AUTHOR = {
  handle: '@owengregson',
  url: 'https://github.com/owengregson',
};
