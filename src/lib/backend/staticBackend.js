/**
 * Read-only backend used on the published site until a database is
 * configured: it serves the seasons bundled with the site and nothing else.
 */
export function createStaticBackend(bundledSeasons) {
  const unavailable = async () => {
    throw new Error('This site is not connected to a database yet.');
  };

  return {
    name: 'static',
    canSubmit: false,
    listSeasons: async () => bundledSeasons,
    submitDatapoint: unavailable,
    getSession: async () => null,
    signIn: unavailable,
    signOut: async () => {},
    listSubmissions: unavailable,
    getProofUrl: unavailable,
    approveSubmission: unavailable,
    denySubmission: unavailable,
    deleteSubmission: unavailable,
    saveDatapoint: unavailable,
    deleteDatapoint: unavailable,
    saveSeason: unavailable,
    deleteSeason: unavailable,
  };
}
